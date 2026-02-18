    import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
    import { CommonModule } from '@angular/common';
    import { FormsModule } from '@angular/forms';
    import { MissionService } from '../../_services/mission-service';
    import { ActivatedRoute, Router } from '@angular/router';
    import { Mission } from '../../_models/mission';
    import { PassportService } from '../../_services/passport-service';
    import { BrawlerProfile } from '../../_models/brawler';
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
        members: BrawlerProfile[] = [];

        // System Status
        connectionStatus: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';
        errorMessage: string = '';

        // Voice States
        isMuted: boolean = false;
        isDeafened: boolean = false; // System deafen (mute incoming)
        isTalking: boolean = false;

        // Audio Analysis (Visualizer)
        private audioContext: AudioContext | undefined;
        private analyser: AnalyserNode | undefined;
        private microphone: MediaStreamAudioSourceNode | undefined;
        private dataArray: Uint8Array | undefined;
        private updateInterval: any;

        // WebRTC / PeerJS
        private peer: Peer | undefined;
        private myStream: MediaStream | undefined;
        private pollInterval: any;

        remoteStreams: Map<string, MediaStream> = new Map();

        ngOnInit() {
            this._route.params.subscribe(params => {
                this.missionId = +params['id'];
                if (this.missionId) {
                    this.loadMissionData();
                    this.startMemberPolling();
                }
            });
        }

        async loadMissionData() {
            try {
                this.mission = await this._missionService.getOne(this.missionId);
                const initialMembers = await this._missionService.getMembers(this.missionId);
                this.members = initialMembers;
                this._cdr.markForCheck();
            } catch (e) { console.error('Load mission error', e); }
        }

        async joinVoiceChannel() {
            if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') return;

            this.connectionStatus = 'connecting';
            this.errorMessage = '';
            this._cdr.markForCheck();

            try {
                // 1. Get Microphone
                this.myStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // 2. Setup Audio Analysis (for visualizer)
                this.setupAudioAnalysis(this.myStream);

                // 3. Init PeerJS
                this.setupPeerConnection();
            } catch (err) {
                console.error('Mic Error:', err);
                this.connectionStatus = 'error';
                this.errorMessage = 'ไม่สามารถเข้าถึงไมโครโฟนได้ (กรุณากด Allow permission)';
                this._cdr.markForCheck();
            }
        }

        setupAudioAnalysis(stream: MediaStream) {
            try {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.microphone.connect(this.analyser);
                this.analyser.fftSize = 256;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

                // Start checking volume levels
                this.updateInterval = setInterval(() => {
                    if (this.isMuted) {
                        if (this.isTalking) { this.isTalking = false; this._cdr.markForCheck(); }
                        return;
                    }
                    if (this.analyser && this.dataArray) {
                        this.analyser.getByteFrequencyData(this.dataArray);
                        let sum = 0;
                        for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
                        const average = sum / this.dataArray.length;
                        const wasTalking = this.isTalking;
                        this.isTalking = average > 15; // Threshold
                        if (wasTalking !== this.isTalking) this._cdr.markForCheck();
                    }
                }, 100);
            } catch (e) {
                console.error('Audio Context Error', e);
            }
        }

        setupPeerConnection() {
            const myUserId = this.passport()?.user?.id;

            // Use DETERMINISTIC ID so others can find us
            const peerId = `rov-mission-${this.missionId}-user-${myUserId}`;

            console.log('Connecting to PeerServer as:', peerId);

            this.peer = new Peer(peerId, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                },
                debug: 1
            });

            this.peer.on('open', (id) => {
                console.log('Peer Open:', id);
                this.connectionStatus = 'connected';
                this.connectToAllMembers();
                this._cdr.markForCheck();
            });

            this.peer.on('call', (call) => {
                console.log('Receiving call from', call.peer);
                call.answer(this.myStream);
                call.on('stream', (remoteStream) => this.handleRemoteStream(call.peer, remoteStream));
            });

            this.peer.on('error', (err: any) => {
                console.error('Peer Error:', err);
                if (err.type === 'unavailable-id') {
                    this.connectionStatus = 'error';
                    this.errorMessage = 'ID ถูกใช้งานอยู่ (Ghost Session) กรุณารอสักครู่แล้วลองใหม่';
                } else if (this.connectionStatus !== 'connected') {
                    this.connectionStatus = 'error';
                    this.errorMessage = 'การเชื่อมต่อล้มเหลว';
                }
                this._cdr.markForCheck();
            });
        }

        connectToAllMembers() {
            if (!this.peer || !this.myStream) return;
            const myUserId = this.passport()?.user?.id;

            this.members.forEach(m => {
                if (m.id === myUserId) return;

                const targetPeerId = `rov-mission-${this.missionId}-user-${m.id}`;
                console.log('Calling:', targetPeerId);

                const call = this.peer!.call(targetPeerId, this.myStream!);
                if (call) {
                    call.on('stream', (remoteStream) => this.handleRemoteStream(targetPeerId, remoteStream));
                    call.on('error', (e) => console.log('Call error to ' + targetPeerId, e));
                }
            });
        }

        handleRemoteStream(peerId: string, stream: MediaStream) {
            if (this.remoteStreams.has(peerId)) return;

            console.log('Got remote stream from:', peerId);
            this.remoteStreams.set(peerId, stream);

            this.createAudioElement(peerId, stream);
            this._cdr.markForCheck();
        }

        createAudioElement(peerId: string, stream: MediaStream) {
            const existing = document.getElementById(`audio-${peerId}`);
            if (existing) existing.remove();

            const audio = document.createElement('audio');
            audio.srcObject = stream;
            audio.id = `audio-${peerId}`;
            audio.autoplay = true;
            (audio as any).playsInline = true;
            document.body.appendChild(audio);

            // Handle Autoplay Policy
            audio.play().catch(async () => {
                console.warn('Autoplay blocked');
                // User interactions usually unlock this, but we are already inside a 'click' derived flow (joinVoiceChannel)
            });
        }

        startMemberPolling() {
            if (this.pollInterval) clearInterval(this.pollInterval);
            this.pollInterval = setInterval(async () => {
                try {
                    const latestMembers = await this._missionService.getMembers(this.missionId);

                    // Diff members to find new joiners
                    const oldIds = this.members.map(m => m.id);
                    const newJoiners = latestMembers.filter(m => !oldIds.includes(m.id));

                    this.members = latestMembers;
                    this._cdr.markForCheck();

                    // If we are connected and someone new joined, call them
                    if (this.connectionStatus === 'connected' && newJoiners.length > 0) {
                        const myUserId = this.passport()?.user?.id;
                        if (!this.peer || !this.myStream) return;

                        newJoiners.forEach(m => {
                            if (m.id === myUserId) return;
                            const targetPeerId = `rov-mission-${this.missionId}-user-${m.id}`;
                            console.log('New member joined, calling:', targetPeerId);
                            const call = this.peer!.call(targetPeerId, this.myStream!);
                            if (call) {
                                call.on('stream', (rs) => this.handleRemoteStream(targetPeerId, rs));
                            }
                        });
                    }
                } catch (e) { }
            }, 5000);
        }

        disconnect() {
            this.leaveVoice();
            this._router.navigate(['/missions']);
        }

        leaveVoice() {
            if (this.peer) {
                this.peer.destroy();
                this.peer = undefined;
            }

            // Stop Analysis
            if (this.updateInterval) clearInterval(this.updateInterval);
            if (this.audioContext) this.audioContext.close();

            // Stop Streams
            this.remoteStreams.forEach(stream => {
                stream.getTracks().forEach(t => t.stop());
            });

            // Remove Audio Elements
            this.remoteStreams.forEach((_, key) => {
                const el = document.getElementById(`audio-${key}`);
                if (el) el.remove();
            });
            this.remoteStreams.clear();

            if (this.myStream) {
                this.myStream.getTracks().forEach(t => t.stop());
                this.myStream = undefined;
            }

            this.connectionStatus = 'idle';
            this._cdr.markForCheck();
        }

        toggleMic() {
            this.isMuted = !this.isMuted;
            if (this.myStream) {
                this.myStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted);
            }
            this._cdr.markForCheck();
        }

        toggleDeafen() {
            this.isDeafened = !this.isDeafened;
            this.remoteStreams.forEach(s => {
                s.getAudioTracks().forEach(t => t.enabled = !this.isDeafened);
            });
            this._cdr.markForCheck();
        }

        ngOnDestroy() {
            this.leaveVoice();
            if (this.pollInterval) clearInterval(this.pollInterval);
        }

        // Helpers
        // Status Logic: Check if we have a stream for them
        getMemberStatus(memberId: number): string {
            const myUserId = this.passport()?.user?.id;
            if (memberId === myUserId) {
                return this.connectionStatus === 'connected' ? 'Connected' : 'Offline';
            }

            // Check map
            const targetPeerId = `rov-mission-${this.missionId}-user-${memberId}`;
            return this.remoteStreams.has(targetPeerId) ? 'Connected' : 'Offline'; // Simple check
        }

        trackById(index: number, item: BrawlerProfile) { return item.id; }
    }
