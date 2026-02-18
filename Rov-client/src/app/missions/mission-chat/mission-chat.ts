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

    // Voice States
    isMuted: boolean = false;
    isDeafened: boolean = false;
    isTalking: boolean = false;

    // Audio Context (Visualization)
    private audioContext: AudioContext | undefined;
    private analyser: AnalyserNode | undefined;
    private microphone: MediaStreamAudioSourceNode | undefined;
    private dataArray: Uint8Array | undefined;
    private updateInterval: any;

    // WebRTC / PeerJS
    private peer: Peer | undefined;
    private myStream: MediaStream | undefined;
    remoteStreams: Map<string, MediaStream> = new Map(); // peerId -> Stream

    ngOnInit() {
        this._route.params.subscribe(params => {
            this.missionId = +params['id'];
            if (this.missionId) {
                this.loadMission();
            }
        });
    }

    async initAudioAndPeer() {
        try {
            // 1. Get User Media
            this.myStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Setup Visualization
            this.setupAudioAnalysis(this.myStream);

            // 3. Setup PeerJS
            this.setupPeerConnection();

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Cannot access microphone. Voice features will be disabled.');
        }
    }

    setupAudioAnalysis(stream: MediaStream) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.microphone.connect(this.analyser);

        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        this.startAudioAnalysis();
    }

    setupPeerConnection() {
        const myUserId = this.passport()?.user?.id;
        if (!myUserId || !this.missionId) return;

        // Create predictable Peer ID
        const myPeerId = `rov-mission-${this.missionId}-user-${myUserId}`;

        console.log('Initializing Peer with ID:', myPeerId);

        this.peer = new Peer(myPeerId, {
            // Use default PeerJS cloud server (0.peerjs.com)
            // You can configure your own TURN/STUN here if needed
            debug: 1
        });

        this.peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            this.connectToMissionMembers();
        });

        this.peer.on('call', (call) => {
            console.log('Incoming call from:', call.peer);
            // Answer the call with our stream
            call.answer(this.myStream);

            call.on('stream', (remoteStream) => {
                console.log('Received stream from:', call.peer);
                this.handleRemoteStream(call.peer, remoteStream);
            });
        });

        this.peer.on('error', (err) => {
            console.warn('PeerJS Error:', err);
            // Handle specific errors like 'unavailable-id' if needed
        });
    }

    connectToMissionMembers() {
        const myUserId = this.passport()?.user?.id;

        this.members.forEach(member => {
            if (member.id === myUserId) return; // Don't call self

            const peerIdToCall = `rov-mission-${this.missionId}-user-${member.id}`;
            console.log('Trying to call peer:', peerIdToCall);

            if (!this.peer || !this.myStream) return;

            const call = this.peer.call(peerIdToCall, this.myStream);

            // If they are online and answer:
            if (call) {
                call.on('stream', (remoteStream) => {
                    console.log('Connected to peer:', peerIdToCall);
                    this.handleRemoteStream(peerIdToCall, remoteStream);
                });

                call.on('error', (err) => {
                    console.log('Call error to ' + peerIdToCall, err);
                });
            }
        });
    }

    handleRemoteStream(peerId: string, stream: MediaStream) {
        // Prevent duplicate streams
        if (this.remoteStreams.has(peerId)) return;

        this.remoteStreams.set(peerId, stream);

        // Check deafen status immediately
        if (this.isDeafened) {
            stream.getAudioTracks().forEach(track => track.enabled = false);
        }

        this.createAudioElement(peerId, stream);
        this._cdr.markForCheck();
    }

    createAudioElement(peerId: string, stream: MediaStream) {
        const audio = document.createElement('audio');
        audio.srcObject = stream;
        audio.id = `audio-${peerId}`;
        audio.autoplay = true;
        // audio.controls = true; // Debug only
        audio.style.display = 'none'; // Hidden
        document.body.appendChild(audio);
    }

    startAudioAnalysis() {
        if (!this.analyser || !this.dataArray) return;

        this.updateInterval = setInterval(() => {
            if (this.isMuted) {
                if (this.isTalking) {
                    this.isTalking = false;
                    this._cdr.markForCheck();
                }
                return;
            }

            this.analyser!.getByteFrequencyData(this.dataArray as any);
            let sum = 0;
            for (let i = 0; i < this.dataArray!.length; i++) {
                sum += this.dataArray![i];
            }
            const average = sum / this.dataArray!.length;
            const wasTalking = this.isTalking;
            this.isTalking = average > 15;

            if (wasTalking !== this.isTalking) {
                this._cdr.markForCheck();
            }
        }, 100);
    }

    stopAudioAnalysis() {
        if (this.updateInterval) clearInterval(this.updateInterval);

        if (this.audioContext) {
            this.audioContext.close();
        }

        // Clean up PeerJS
        if (this.peer) {
            this.peer.destroy();
        }

        // Remove audio elements
        this.remoteStreams.forEach((_, peerId) => {
            const el = document.getElementById(`audio-${peerId}`);
            if (el) el.remove();
        });
        this.remoteStreams.clear();

        // Stop tracks
        if (this.myStream) {
            this.myStream.getTracks().forEach(track => track.stop());
        }
    }

    ngOnDestroy() {
        this.stopAudioAnalysis();
    }

    async loadMission() {
        try {
            this.mission = await this._missionService.getOne(this.missionId);
            // Fetch detailed members list
            this.members = await this._missionService.getMembers(this.missionId);
            this.memberCount = this.members.length;

            // Init Audio AFTER we have members info (though practically we could do it parallel, 
            // but we need members list for calling)
            this.initAudioAndPeer();

            this._cdr.markForCheck();
        } catch (e) {
            console.error('Error loading mission details', e);
        }
    }

    toggleMic() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) this.isTalking = false;

        // Toggle Audio Track Enabled
        if (this.myStream) {
            this.myStream.getAudioTracks().forEach(track => track.enabled = !this.isMuted);
        }

        this._cdr.markForCheck();
    }

    toggleDeafen() {
        this.isDeafened = !this.isDeafened;

        if (this.isDeafened) {
            this.isMuted = true; // Auto mute self when deafen
            if (this.myStream) {
                this.myStream.getAudioTracks().forEach(track => track.enabled = false);
            }
        } else {
            // If undeafen, keep muted unless user explicitly unmutes? 
            // Usually undeafen restores previous mute state, but simple logic: stay muted for safety
            // or check previous state. I'll stick to 'isMuted=true' for safety.
        }

        // Handle Remote Streams
        this.remoteStreams.forEach(stream => {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !this.isDeafened;
            });
        });

        this._cdr.markForCheck();
    }

    disconnect() {
        this._router.navigate(['/missions']);
    }
}
