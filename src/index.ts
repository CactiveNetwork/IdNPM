import fetch from 'phin';
import { ScopedUser, User } from './types';

type ConnectionOpts = {
    base_url: string,
    verbose: boolean
}

class Connections {

    private _token: string;
    private _options: ConnectionOpts;

    constructor(token: string, options: Partial<ConnectionOpts>) {

        this._token = token;

        this._options = {
            base_url: options.base_url ?? 'https://cactive.id/api/v2/',
            verbose: options.verbose ?? false,
        };

    }

    private $<T>(endpoint: string, method: string, data?: object) {
        if (this._options.verbose) console.log(`[📡] :: ${method} @ ${this._options.base_url + endpoint}`);

        return new Promise<T>((resolve, reject) => {
            fetch({
                method,
                url: this._options.base_url + endpoint,
                data: data ?? '',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${this._token}`,
                },
            }).then(res => {
                const ok = !res.statusCode ? false : res.statusCode >= 200 && res.statusCode < 300;

                if (ok) { try { resolve(JSON.parse(res.body.toString()) as T) } catch (e) { reject(e) }; }
                else if (res.statusCode === 400) reject(res.statusMessage);
                else reject(`Server Error: ${res.statusMessage || res.statusCode || 'Unknown'}`);
            });
        });
    }

    /**
     * Fetches a refresh token based on Identification token from an OAuth gateway
     * @param identifier_token Identifier token provided by the oauth gateway
     * @param client_id Project Client Id
     * @param client_secret Project Client Secret
     * @param redirect_uri Used Redirect URI
     * @param scopes Used Scopes
     * @returns Refresh token
     */
    public oauthIdentify(identifier_token: string, client_id: string, client_secret: string, redirect_uri: string, scopes: number[]) {
        return this.$<{ refresh: string, access: string }>(`oauth/identify`, 'POST', {
            client_id,
            redirect_uri,
            scopes,
            token: identifier_token,
            client_secret
        })
    }

    /**
     * Creates an Access Token from a Refresh Token
     * @param refresh_token Refresh token
     * @returns Access token
     */
    public async refreshToken(refresh_token: string) {
        return (await this.$<{ refresh: string }>(`oauth/refresh`, 'POST', { token: refresh_token })).refresh;
    }

    /**
     * Fetches a user by an Access Token
     * @param access_token Access token
     * @returns User
     */
    public getUserByAccessToken(access_token: string) {
        this.$<ScopedUser>(`oauth/user`, 'POST', { token: access_token })
    }

    /**
     * Fetches a User by their ID
     * @param id User ID
     * @returns User
     */
    public getUser(id: string) {
        return this.$<User>(`user/${encodeURIComponent(id)}`, 'GET');
    }

}

module.exports = Connections;
export default Connections;
