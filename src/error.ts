const Errors = {

    INVALID_UUID: "The UUID provided is invalid (incorrect format)",
    INVALID_ROLE: "The role provided is invalid (invalid key)",
    SOCKET_ERROR: "Unable to interface with the servers websocket server",
    INVALID_USER: "Specified user has a null ID denoting a non-real user"

}

export default function FetchError(error: keyof typeof Errors) {
    return new Error(Errors[error]);
}