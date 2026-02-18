import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MissionService } from '../../_services/mission-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Mission } from '../../_models/mission';
import { PassportService } from '../../_services/passport-service';

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
    memberCount: number = 0;

    // Voice States
    isMuted: boolean = false;
    isDeafened: boolean = false;
    isTalking: boolean = false;

    // Audio Context
    private audioContext: AudioContext | undefined;
    private analyser: AnalyserNode | undefined;
    private microphone: MediaStreamAudioSourceNode | undefined;
    private dataArray: Uint8Array | undefined;
    private updateInterval: any;

    ngOnInit() {
        this._route.params.subscribe(params => {
            this.missionId = +params['id'];
            if (this.missionId) {
                this.loadMission();
            }
        });

        this.initAudio();

        // บังคับตรวจสอบการเปลี่ยนแปลงเมื่อ Component เริ่มทำงาน
        setTimeout(() => {
            this._cdr.markForCheck();
        }, 500);
    }

    private stream: MediaStream | undefined;

    async initAudio() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(this.stream);

            this.microphone.connect(this.analyser);

            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.startAudioAnalysis();
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Cannot access microphone. Voice features will be disabled.');
        }
    }

    startAudioAnalysis() {
        if (!this.analyser || !this.dataArray) return;

        // Check volume level periodically
        this.updateInterval = setInterval(() => {
            if (this.isMuted) {
                if (this.isTalking) {
                    this.isTalking = false;
                    this._cdr.markForCheck();
                }
                return;
            }

            this.analyser!.getByteFrequencyData(this.dataArray as any);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < this.dataArray!.length; i++) {
                sum += this.dataArray![i];
            }
            const average = sum / this.dataArray!.length;

            // Threshold for "talking" state (adjust as needed, usually around 10-20)
            const wasTalking = this.isTalking;
            this.isTalking = average > 15; // increased threshold slightly to avoid noise

            if (wasTalking !== this.isTalking) {
                this._cdr.markForCheck();
            }
        }, 100); // Check 10 times per second
    }

    stopAudioAnalysis() {
        if (this.updateInterval) clearInterval(this.updateInterval);

        if (this.audioContext) {
            this.audioContext.close();
        }

        // Stop tracks from the stored stream reference
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    ngOnDestroy() {
        this.stopAudioAnalysis();
    }

    async loadMission() {
        try {
            this.mission = await this._missionService.getOne(this.missionId);
            this.memberCount = await this._missionService.getMemberCount(this.missionId);
            this._cdr.markForCheck();
        } catch (e) {
            console.error('Error loading mission details', e);
        }
    }

    toggleMic() {
        this.isMuted = !this.isMuted;

        // If muted, force talking to false immediately
        if (this.isMuted) {
            this.isTalking = false;
        }

        this._cdr.markForCheck();
    }

    toggleDeafen() {
        this.isDeafened = !this.isDeafened;
        if (this.isDeafened) {
            this.isMuted = true; // Usually deafen also mutes
        }
        this._cdr.markForCheck();
    }

    disconnect() {
        // Leave voice channel -> Go back to mission list
        this._router.navigate(['/missions']);
    }
}
