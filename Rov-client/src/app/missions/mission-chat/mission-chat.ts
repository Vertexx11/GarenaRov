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
        if (this.peer && !this.peer.destroyed) {
            console.warn('Peer already initialized. Skipping.');
            return;
        }

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
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            },
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

        this.peer.on('error', (err: any) => {
            console.warn('PeerJS Error:', err);
            if (err.type === 'unavailable-id') {
                console.error('Peer ID is taken. Session might be active in another tab.');
                alert('Connection Error: You are already connected in another tab or session is stuck. Please close other tabs and try again later.');
            } else if (err.type === 'peer-unavailable') {
                console.log('Peer not found (might be offline).');
            } else if (err.type === 'network' || err.type === 'disconnected') {
                console.error('Network error. Reconnecting in 3s...');
                setTimeout(() => this.reconnect(), 3000);
            }
        });
    }

    connectToMissionMembers() {
        // Initial connection to existing members
        this.callMembers(this.members);
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

    reconnect() {
        if (this.peer && !this.peer.destroyed) {
            this.peer.destroy();
        }
        this.remoteStreams.clear(); // Clear old streams
        this.initAudioAndPeer(); // Restart everything
    }

    createAudioElement(peerId: string, stream: MediaStream) {
        const audio = document.createElement('audio');
        audio.srcObject = stream;
        audio.id = `audio-${peerId}`;
        audio.autoplay = true;
        audio.style.display = 'none';
        document.body.appendChild(audio);

        // Handle Autoplay Policy
        audio.play().catch(e => {
            console.warn('Autoplay blocked for peer:', peerId, e);
            // Optionally show a "Play" button UI to user here if needed
        });
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
        if (this.pollInterval) clearInterval(this.pollInterval);

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

    private pollInterval: any;

    async loadMission() {
        try {
            this.mission = await this._missionService.getOne(this.missionId);

            // 1. Fetch members for the first time
            const initialMembers = await this._missionService.getMembers(this.missionId);
            this.updateMembers(initialMembers);

            // 2. Initialize PeerJS (Done only once)
            if (!this.peer) {
                await this.initAudioAndPeer();
            }

            // 3. Setup Polling (every 5 seconds)
            this.startPolling();

            this._cdr.markForCheck();
        } catch (e) {
            console.error('Error loading mission details', e);
        }
    }

    private startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);

        this.pollInterval = setInterval(async () => {
            try {
                const refreshedMembers = await this._missionService.getMembers(this.missionId);
                this.updateMembers(refreshedMembers);
            } catch (e) {
                console.warn('Polling members failed', e);
            }
        }, 5000);
    }

    private updateMembers(newMembers: Brawler[]) {
        const myUserId = this.passport()?.user?.id;

        // Find NEW members who weren't in our list before
        const newJoiners = newMembers.filter(nm =>
            nm.id !== myUserId &&
            !this.members.some(m => m.id === nm.id)
        );

        this.members = newMembers;
        this.memberCount = this.members.length;

        // If we already have PeerJS setup, call the new joiners
        if (this.peer && newJoiners.length > 0) {
            console.log(`Found ${newJoiners.length} new joiners, initiating calls...`);
            this.callMembers(newJoiners);
        }

        this._cdr.markForCheck();
    }

    private callMembers(targets: Brawler[]) {
        if (!this.peer || !this.myStream) return;

        targets.forEach(member => {
            const peerIdToCall = `rov-mission-${this.missionId}-user-${member.id}`;

            // Check if already connected/calling
            if (this.remoteStreams.has(peerIdToCall)) return;

            console.log('Automated call to new joiner:', peerIdToCall);
            const call = this.peer!.call(peerIdToCall, this.myStream!);

            if (call) {
                call.on('stream', (remoteStream) => {
                    this.handleRemoteStream(peerIdToCall, remoteStream);
                });
                call.on('error', (err) => console.log('Call error to ' + peerIdToCall, err));
            }
        });
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
