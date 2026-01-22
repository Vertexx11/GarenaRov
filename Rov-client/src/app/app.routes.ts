import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Profile } from './profile/profile';
import { ServerError } from './server-error/server-error';
import { NotFound } from './not-found/not-found';
import { Login } from './login/login';

export const routes: Routes = [
    {path: '', component:Home},
    {path: 'login', component:Login},
    {path: 'server-error', component: ServerError},
    {path: 'profile', 
        component:Profile,
        runGuardsAndResolvers: 'always',
        canActivate: []
    },
    {path: '**', component:NotFound},
];
