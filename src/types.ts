export type ScopedUser = Partial<{
    id: string,
    name: string,
    email: string,
    connections: {

        permissions: number,
    }[],
}>

export type Application = {
    id: string,
    name: string,
    owner_id: string,
    owner_name: string,
    meta: {
        homepage?: string,
        terms_of_service?: string,
        contact?: string
    }
}

export type OwnedApplication = Omit<Application, 'owner_name'> & {
    secret: boolean,
    sessions: string[],
}

export type User = {
    id: string,
    display: string,
    applications: Application[]
}

export type Self = Omit<User, 'applications'> & {
    email: string,
    authentication: {
        password: boolean,
        totp: boolean,
        authn: []
    },
    applications: OwnedApplication[]
}