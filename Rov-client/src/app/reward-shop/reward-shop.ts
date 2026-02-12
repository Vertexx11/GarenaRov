import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MissionService } from '../_services/mission-service';
import { PassportService } from '../_services/passport-service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface RewardItem {
    id: number;
    name: string;
    description: string;
    cost: number;
    image: string;
    icon: string;
}

@Component({
    selector: 'app-reward-shop',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatSnackBarModule
    ],
    templateUrl: './reward-shop.html',
    styleUrl: './reward-shop.css'
})
export class RewardShop implements OnInit {
    private _missionService = inject(MissionService);
    private _passportService = inject(PassportService);
    private _snackBar = inject(MatSnackBar);

    myPoints: number = 0;

    items: RewardItem[] = [
        { id: 1, name: 'Double XP Boost', description: 'x2 EXP for 24 hours', cost: 50, image: 'assets/rewards/xp-boost.png', icon: 'bolt' },
        { id: 2, name: 'Golden Frame', description: 'Exclusive profile frame', cost: 100, image: 'assets/rewards/frame.png', icon: 'filter_frames' },
        { id: 3, name: 'MVP Badge', description: 'Show off your skills', cost: 200, image: 'assets/rewards/badge.png', icon: 'military_tech' },
        { id: 4, name: 'Skin: Abyssal Terror', description: 'Limited edition skin', cost: 500, image: 'assets/rewards/skin.png', icon: 'palette' },
        { id: 5, name: 'Name Color Change', description: 'Customize your name color', cost: 150, image: 'assets/rewards/color.png', icon: 'format_paint' },
        { id: 6, name: 'Mystery Box', description: 'Random rare item', cost: 75, image: 'assets/rewards/box.png', icon: 'inventory_2' },
    ];

    async ngOnInit() {
        await this.loadMyPoints();
    }

    async loadMyPoints() {
        try {
            const userStr = localStorage.getItem('user');
            const myId = userStr ? JSON.parse(userStr).id : 0;
            const myName = this._passportService.data()?.user?.display_name;

            const leaderboard = await this._missionService.getLeaderboard();
            const me = leaderboard.find((b: any) => b.id === myId || b.username === myName || b.username === 'Kinn');

            this.myPoints = me ? me.total_points : 0;
        } catch (error) {
            console.error('Error loading points:', error);
            this.myPoints = 0;
        }
    }

    redeem(item: RewardItem) {
        if (this.myPoints >= item.cost) {
            // Logic for redemption (Mock for now as we don't have backend api for it)
            this.myPoints -= item.cost;
            // In real app, we would call API here: this._missionService.redeem(item.id)

            this._snackBar.open(`🎉 Redeemed ${item.name} successfully!`, 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });
        } else {
            this._snackBar.open(`❌ Not enough points! You need ${item.cost - this.myPoints} more.`, 'Close', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
        }
    }
}
