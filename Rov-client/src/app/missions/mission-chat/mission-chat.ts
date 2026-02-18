import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MissionService } from '../../_services/mission-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Mission } from '../../_models/mission';
import { PassportService } from '../../_services/passport-service';
import { Brawler } from '../../_models/brawler';
import Peer from 'peerjs';

@Component({
    selector: 'app-mission-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './mission-chat.html',
    styleUrl: './mission-chat.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MissionChat implements OnInit, OnDestroy {
    private _missionService = inject(MissionService);
    private _route = inject(ActivatedRoute);
    readonly passport = inject(PassportService).data;
    private _cdr = inject(ChangeDetectorRef);
    private _router = inject(Router);

    missionId!: number;
    mission: Mission | undefined;
    members: Brawler[] = [];
    memberCount: number = 0;

    isMuted: boolean = false;
    isDeafened: boolean = false;
    isTalking: boolean = false;
    isAudioStarted: boolean = false; 

    private audioContext: AudioContext | undefined;
    private analyser: AnalyserNode | undefined;
    private microphone: MediaStreamAudioSourceNode | undefined;
    private dataArray: Uint8Array | undefined;
    private updateInterval: any;

    private peer: Peer | undefined;
    private myStream: MediaStream | undefined;
    remoteStreams: Map<string, MediaStream> = new Map(); 

    ngOnInit() {
        this._route.params.subscribe(params => {
            this.missionId = +params['id'];
            if (this.missionId) {
                this.loadMission();
            }
        });
    }

    async initAudioAndPeer() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = undefined;
        }

        try {
            this.myStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupAudioAnalysis(this.myStream);
            this.setupPeerConnection();
            this.isAudioStarted = true;
            this._cdr.markForCheck();
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('ไม่สามารถเข้าถึงไมโครโฟนได้ ระบบเสียงจะถูกปิดใช้งาน');
        }
    }

    setupAudioAnalysis(stream: MediaStream) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.microphone.connect(this.analyser);
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.startAudioAnalysis();
    }

    setupPeerConnection() {
        const myUserId = this.passport()?.user?.id;
        if (!myUserId || !this.missionId) return;

        const randomId = Math.random().toString(36).substring(7);
        const myPeerId = `rov-mission-${this.missionId}-user-${myUserId}-${randomId}`;

        console.log('Initializing Peer with ID:', myPeerId);

        this.peer = new Peer(myPeerId, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            },
            debug: 2 
        });

        this.peer.on('open', (id) => {
            console.log('Connected to PeerServer with ID: ' + id);
            this.connectToMissionMembers(); // เรียกใช้ฟังก์ชันที่เติมเข้ามาใหม่
        });

        this.peer.on('call', (call) => {
            console.log('Incoming call from:', call.peer);
            call.answer(this.myStream);
            call.on('stream', (remoteStream) => {
                this.handleRemoteStream(call.peer, remoteStream);
            });
        });

        this.peer.on('error', (err: any) => {
            console.warn('PeerJS Error:', err.type, err);
            if (err.type === 'unavailable-id') {
                setTimeout(() => this.reconnect(), 2000);
            } else if (err.type === 'network' || err.type === 'disconnected') {
                this.reconnect();
            }
        });
    }

    // --- ส่วนที่เติมเพิ่มจากรูป image_d731c5.png ---
    connectToMissionMembers() {
        console.log('Connecting to existing members...');
        this.callMembers(this.members);
    }
    // ------------------------------------------

    handleRemoteStream(peerId: string, stream: MediaStream) {
        if (this.remoteStreams.has(peerId)) return;
        this.remoteStreams.set(peerId, stream);

        if (this.isDeafened) {
            stream.getAudioTracks().forEach(track => track.enabled = false);
        }

        this.createAudioElement(peerId, stream);
        this._cdr.markForCheck();
    }

    reconnect() {
        console.log('Attempting to reconnect...');
        this.stopAudioAnalysis();
        setTimeout(() => this.initAudioAndPeer(), 1000);
    }

    createAudioElement(peerId: string, stream: MediaStream) {
        const oldEl = document.getElementById(`audio-${peerId}`);
        if (oldEl) oldEl.remove();

        const audio = document.createElement('audio');
        audio.srcObject = stream;
        audio.id = `audio-${peerId}`;
        audio.autoplay = true;
        audio.style.display = 'none';
        document.body.appendChild(audio);

        audio.play().catch(async () => {
            console.warn('Autoplay blocked. Waiting for user interaction.');
            if (this.audioContext) await this.audioContext.resume();
        });
    }

    startAudioAnalysis() {
        if (!this.analyser || !this.dataArray) return;
        this.updateInterval = setInterval(() => {
            if (this.isMuted) {
                if (this.isTalking) { this.isTalking = false; this._cdr.markForCheck(); }
                return;
            }
            this.analyser!.getByteFrequencyData(this.dataArray as any);
            let sum = 0;
            for (let i = 0; i < this.dataArray!.length; i++) sum += this.dataArray![i];
            const average = sum / this.dataArray!.length;
            const wasTalking = this.isTalking;
            this.isTalking = average > 15;
            if (wasTalking !== this.isTalking) this._cdr.markForCheck();
        }, 100);
    }

    stopAudioAnalysis() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        if (this.pollInterval) clearInterval(this.pollInterval);
        if (this.audioContext) this.audioContext.close();
        if (this.peer) { this.peer.destroy(); this.peer = undefined; }
        this.remoteStreams.forEach((_, peerId) => {
            const el = document.getElementById(`audio-${peerId}`);
            if (el) el.remove();
        });
        this.remoteStreams.clear();
        if (this.myStream) this.myStream.getTracks().forEach(track => track.stop());
    }

    ngOnDestroy() { this.stopAudioAnalysis(); }

    private pollInterval: any;
    async loadMission() {
        try {
            this.mission = await this._missionService.getOne(this.missionId);
            const initialMembers = await this._missionService.getMembers(this.missionId);
            this.updateMembers(initialMembers);
            if (!this.peer) await this.initAudioAndPeer();
            this.startPolling();
            this._cdr.markForCheck();
        } catch (e) { console.error('Error loading mission', e); }
    }

    private startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(async () => {
            try {
                const refreshedMembers = await this._missionService.getMembers(this.missionId);
                this.updateMembers(refreshedMembers);
            } catch (e) { console.warn('Polling failed', e); }
        }, 5000);
    }

    private updateMembers(newMembers: Brawler[]) {
        const myUserId = this.passport()?.user?.id;
        const newJoiners = newMembers.filter(nm => 
            nm.id !== myUserId && !this.members.some(m => m.id === nm.id)
        );
        this.members = newMembers;
        this.memberCount = this.members.length;
        if (this.peer && newJoiners.length > 0) this.callMembers(newJoiners);
        this._cdr.markForCheck();
    }

    private callMembers(targets: Brawler[]) {
        if (!this.peer || !this.myStream) return;
        targets.forEach(member => {
            const peerIdToCall = `rov-mission-${this.missionId}-user-${member.id}`;
            const call = this.peer!.call(peerIdToCall, this.myStream!);
            if (call) {
                call.on('stream', (stream) => this.handleRemoteStream(peerIdToCall, stream));
            }
        });
    }

    toggleMic() {
        this.isMuted = !this.isMuted;
        if (this.myStream) this.myStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted);
        this._cdr.markForCheck();
    }

    toggleDeafen() {
        this.isDeafened = !this.isDeafened;
        this.remoteStreams.forEach(s => s.getAudioTracks().forEach(t => t.enabled = !this.isDeafened));
        this._cdr.markForCheck();
    }

    disconnect() { this._router.navigate(['/missions']); }
}