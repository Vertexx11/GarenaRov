import { reqHandler } from '../dist/Avengers-Assembleclient/server/server.mjs';

export default async function handler(req, res) {
    return reqHandler(req, res);
}
