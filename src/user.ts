import { Client } from ".";
import FetchError from "./error";

export type UserData = {
	id: string | null,
	display_name: string | null,
	api_level: "ADMINISTRATOR" | "PROJECT" | "DEFAULT",
	mfa_enabled: boolean,
	services: {
		name: string,
		data: { [key: string]: any }
	}[],
	connections: {
		name: string,
		user: {
			id: string,
			display_name: string
		}
	}[]
}

export default class User {
	id: UserData['id'];
	display_name: string | undefined;
	api_level: UserData['api_level'];
	mfa_enabled: UserData['mfa_enabled'];
	services: UserData['services'];
	connections: UserData['connections'];
	client: Client;

	constructor(client: Client, user_data: UserData) {
		this.id = user_data.id;
		this.display_name = user_data.display_name || undefined;
		this.api_level = user_data.api_level;
		this.mfa_enabled = user_data.mfa_enabled;
		this.services = user_data.services;
		this.connections = user_data.connections.filter(c => c.user.id !== null);
		this.client = client;
	}

	/**
	 * Returns a service and its data
	 * @param service Service name
	 * @returns Service data
	 */
	public get_service(service: string) {
		return this.services.find(s => s.name === service) ?? null;
	}

	/**
	 * Returns a connection and its data
	 * @param connection Connection data
	 * @returns Connection data
	 */
	public get_connection(connection: string) {
		return this.connections.find(c => c.name === connection) ?? null;
	}


	/**
	 * Updates an owned service's data for a user
	 * @param name Service name, must be owned
	 * @param data Updated service structure
	 * @returns Resolution result
	 */
	public setService(name: string, data: { [key: string]: any }): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.id) throw FetchError('INVALID_USER');
			this.client.setService(name, this.id, data)
				.then(() => {
					this.client.getUser(this.id as string)
						.then(user => {
							this.services = user.services;
							resolve()
						})
						.catch(reject)
				})
				.catch(reject)
		});
	}

	/**
	 * Updates User's role
	 * * Requires access to the 'MODIFY_ROLES' permission.
	 * @param role New role
	 * @returns Updated User
	 */
	public setRole(role: User['api_level']): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.id) throw FetchError('INVALID_USER');
			return this.client.setRole(this.id, role)
				.then(user => {
					this.api_level = user.api_level;
					resolve();
				})
				.catch(reject);
		})
	}

}