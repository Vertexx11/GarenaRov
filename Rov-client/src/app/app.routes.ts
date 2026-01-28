import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Profile } from './profile/profile';
import { ServerError } from './server-error/server-error';
import { NotFound } from './not-found/not-found';
import { Login } from './login/login';
import { Missions } from './missions/missions';
import { MissionManager } from './missions/mission-manager/mission-manager'; 
import { authGuard } from './_guard/auth-guard';

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
        runGuardsAndResolvers: 'always',
        canActivate: []
    },
    { 
        path: 'profile', 
        component: Profile,
        runGuardsAndResolvers: 'always',
        canActivate: []
    },
    { path: '**', component: NotFound }, 
];