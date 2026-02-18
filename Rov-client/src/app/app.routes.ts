import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Profile } from './profile/profile';
import { ServerError } from './server-error/server-error';
import { NotFound } from './not-found/not-found';
import { Login } from './login/login';
import { Missions } from './missions/missions';
import { MissionManager } from './missions/mission-manager/mission-manager';
import { authGuard } from './_guard/auth-guard';
import { LeaderboardComponent } from './leaderboard/leaderboard';



export const routes: Routes = [
    { path: '', component: Home },
    { path: 'login', component: Login },
    { path: 'server-error', component: ServerError },
    {
        path: 'missions/my-missions',
        component: MissionManager,
        runGuardsAndResolvers: 'always',
        canActivate: [authGuard]
    },
    {
        path: 'missions',
        component: Missions,
        runGuardsAndResolvers: 'always'
    },
    {
        path: 'profile',
        component: Profile,
        runGuardsAndResolvers: 'always'
    },
    { path: 'my-missions', component: MissionManager },
    { path: 'leaderboard', component: LeaderboardComponent },

    { path: '**', component: NotFound },
];