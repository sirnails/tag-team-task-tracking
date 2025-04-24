function wsHandleRoomDeletionRequest(requestingUser) {
    return confirm(`${requestingUser} wants to delete this room. Do you agree?`);
}

export { wsHandleRoomDeletionRequest };
