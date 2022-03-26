import Fetch from "node-fetch";
import FetchError from "./error";
import User, { PartialUser, ProjectData, UserData } from "./user";
import WebSocket from 'ws';
import EventEmitter from "events";
import { randomUUID } from "crypto";

type ConnectionOpts = {
    base_url: string,
    socket_url: string,
    verbose: boolean,
    socket_keepalive: number
}

const Constants = {
    UUID_REGEX: /^\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b$/
}

declare interface Connections {
    on(event: "ready", handler: () => void): this;
}

class Connections extends EventEmitter {

    options: ConnectionOpts;
    private _token: string;
    private _socket: WebSocket;
    private _socket_store: { [identifier: string]: (event: string, data: { [key: string]: any }) => void };
    private _timer: NodeJS.Timeout | null;

    /**
     * Creates a client
     * @param token Authorization token
     * @param options Client options
     */
    constructor(token: string, options: ConnectionOpts | { [key: string]: any } = {}) {

        super();

        this._token = token;
        this._timer = null;

        this.options = {
            base_url: options.base_url ?? 'https://api.cactive.network',
            socket_url: options.socket_url ?? 'wss://api.cactive.network/socket/',
            verbose: options.verbose ?? false,
            socket_keepalive: options.socket_keepalive ?? 5 * 1000
        };

        // Ensure API key works
        this.getSelf()
            .catch((err) => {
                throw err;
            })

        this._socket = new WebSocket(this.options.socket_url);
        this._socket_store = {};

        this._socket.on('message', (raw: string) => {

            if (this.options.verbose) console.log(`[🧦] ${raw}`);

            try {

                const { event, data } = JSON.parse(raw);
                if (!data.identifier) return;

                if (!this._socket_store[data.identifier]) return;
                this._socket_store[data.identifier](event, data);

            } catch (err) {
                console.warn(`Connections Socket Error: ${err}`);
            }

        });

        this._socket.once('open', () => this.emit('ready'));
        this._socket.on('error', (error) => {
            throw error;
        })

        this._socket.on('close', (r) => {
            if (this.options.verbose) console.log(`[🧦] Socket Closing: ${r}`);
        })

        this._timer = setInterval(() => {
            if (this.options.verbose) console.log('[🧦] Socket Keepalive Ping');
            this.socketEmit('ping', { identifier: 'ping' })
        }, this.options.socket_keepalive);

    }

    /**
     * Makes a request to the API
     * @param endpoint Endpoint to target
     * @param method Method to use
     * @param data Outgoing data
     * @returns Response promise
     */
    private request(endpoint: string, method: 'GET' | 'PUT' | 'POST' | 'DELETE', data?: { [key: string]: any }): Promise<{ [key: string]: any } | void> {

        const url = `${this.options.base_url}/${endpoint}`;
        if (this.options.verbose) console.log(`[📡] ${method} :: ${url}`);

        return new Promise((resolve, reject) => {

            let options: { [key: string]: any } = {
                method,
                headers: { 'Authorization': this._token },
            };

            if (data) {
                options['body'] = JSON.stringify(data);
                options['headers']['Content-Type'] = 'application/json';
            }

            Fetch(url, options)
                .then(res => {

                    if (res.headers.get('Content-Type')?.includes('application/json')) {
                        res.json()
                            .then((data) => {
                                if (data.error) {
                                    return reject(new Error(`Connections API Error: ${data.message ?? 'Unknown Error'}`))
                                }
                                resolve(data);
                            })
                            .catch(reject)
                    }

                    else resolve();

                })
                .catch(reject);

        })
    }

    /**
     * Sends an event and data to the server
     * @param event Event name
     * @param data Event data
     */
    private socketEmit(event: string, data: { [key: string]: any }) {
        this._socket.send(JSON.stringify({ event, data, authorization: this._token }));
    }

    /* ----- OAUTH METHODS FOLLOW -----*/

    /**
     * Fetches a refresh token based on Identification token from an OAuth gateway
     * @param identifier_token Identifier token provided by the oauth gateway
     * @param client_id Project Client Id
     * @param client_secret Project Client Secret
     * @param redirect_uri Used Redirect URI
     * @param scopes Used Scopes
     * @returns Refresh token
     */
    public oauthIdentify(identifier_token: string, client_id: string, client_secret: string, redirect_uri: string, scopes: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            this.request(`identify?token=${identifier_token}&client_id=${client_id}&client_secret=${client_secret}&redirect_uri=${redirect_uri}&scope=${scopes.join(',')}`, 'GET')
                .then(data => {
                    resolve((data as any).token);
                })
                .catch(reject)
        });

    }

    /**
     * Creates an Access Token from a Refresh Token
     * @param refresh_token Refresh token
     * @returns Access token
     */
    public refreshToken(refresh_token: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.request(`refresh?token=${refresh_token}`, 'GET')
                .then(data => {
                    resolve((data as any).token);
                })
                .catch(reject)
        });
    }

    public getUserByAccessToken(access_token: string): Promise<PartialUser> {
        return new Promise((resolve, reject) => {
            this.request(`oauth_user?token=${access_token}`, 'GET')
                .then(data => {
                    resolve(data as PartialUser);
                })
                .catch(reject)
        });
    }


    /* ----- API METHODS FOLLOW -----*/

    /**
     * Fetches a User by their ID
     * @param id User ID
     * @returns User
     */
    public getUser(id: string): Promise<User> {
        return new Promise((resolve, reject) => {
            if (!Constants.UUID_REGEX.test(id)) throw FetchError('INVALID_UUID');
            this.request(`user/${id}`, 'GET')
                .then(data => {
                    resolve(new User(this, data as UserData));
                }).catch(reject)
        });
    }

    /**
     * Changes the instance's display name
     * @param display_name New display name
     * @returns Resolution result
     */
    public changeName(display_name: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.request(`display_name?display_name=${encodeURIComponent(display_name)}`, 'PUT')
                .then(() => resolve())
                .catch(reject);
        });
    }

    /**
     * Fetches the instance's User object
     * @returns Own User
     */
    public getSelf(): Promise<User> {
        return new Promise((resolve, reject) => {
            this.request(`self`, 'GET')
                .then(data => {
                    resolve(new User(this, data as UserData));
                }).catch(reject)
        });
    }

    /**
     * Updates a User's role
     * * Requires access to the 'MODIFY_ROLES' permission.
     * @param target Target User's ID
     * @param role New role
     * @returns Updated User
     */
    public setRole(target: string, role: User['api_level']): Promise<User> {
        return new Promise((resolve, reject) => {
            if (!Constants.UUID_REGEX.test(target)) throw FetchError('INVALID_UUID');
            this.request(`role?target=${encodeURIComponent(target)}&role=${encodeURIComponent(role)}`, 'PUT')
                .then(data => {
                    resolve(new User(this, data as UserData));
                }).catch(reject)
        });
    }

    /**
     * Registers or updates your Service's default data structure
     * * Requires access to the 'CREATE_SERVICE' permission.
     * @param name Service name, must be unique
     * @param structure Default fields for your service
     * @returns Resolution result
     */
    public registerService(name: string, structure: { [key: string]: any }): Promise<void> {
        return new Promise((resolve, reject) => {
            this.request(`service`, 'PUT', { name, data: structure })
                .then(() => resolve())
                .catch(reject)
        });
    }

    /**
     * Updates an owned service's data for a user
     * @param name Service name, must be owned
     * @param target Target User's ID
     * @param data Updated service structure
     * @returns Resolution result
     */
    public setService(name: string, target: string, data: { [key: string]: any }): Promise<void> {
        if (!Constants.UUID_REGEX.test(target)) throw FetchError('INVALID_UUID');
        return new Promise((resolve, reject) => {
            this.request(`service/${encodeURIComponent(name)}?target=${encodeURIComponent(target)}`, 'PUT', data)
                .then(() => resolve())
                .catch(reject)
        });
    }

    /**
     * Registers an intent for a user to pay for a service
     * @param price The price to pay, must be less that 9999 and greater than 0
     * @param currency Three digit ISO country code
     * @param purchase_handler Function to handle payments once made
     * @returns Promise of Gateway URL
     */
    public registerPayment(price: number, currency: string, purchase_handler: () => void): Promise<string> {

        return new Promise((resolve, reject) => {

            let identifier = randomUUID();

            this._socket_store[identifier] = (event, data) => {

                if (event === 'error') {
                    return reject(data.message)
                }

                if (event === 'purchase_registered') {
                    return resolve(data.url);
                }

                if (event === 'purchase_complete') {
                    purchase_handler();
                    delete this._socket_store[identifier];
                }

            }

            this.socketEmit('create_purchase', {
                identifier, price, currency
            })

        })

    }

    /**
     * Creates a new Project
     * * Requires access to the 'CREATE_PROJECT' permission.
     * * Max of 25
     * @returns Resolution result
     */
    public createProject(): Promise<ProjectData & { token: string }> {
        return new Promise((resolve, reject) => {
            this.request(`PROJECT`, 'PUT')
                .then(resolve as any)
                .catch(reject)
        });
    }

    /**
     * Fetches an owned project by ID
     * @param id Project ID
     * @returns Project
     */
    public fetchProject(id: string): Promise<User> {
        return new Promise((resolve, reject) => {
            if (!Constants.UUID_REGEX.test(id)) throw FetchError('INVALID_UUID');
            this.request(`project/${id}`, 'GET')
                .then(data => {
                    resolve(new User(this, data as UserData));
                }).catch(reject)
        });
    }

}

export {
    Connections as Client
};