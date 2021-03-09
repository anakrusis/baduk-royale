// SERVER CONFIG, neccessary to run the server

config = {
	PORT:23456,
	BOARD_WIDTH:50,
	BOARD_HEIGHT:50,
	MAX_PLAYERS:16,
	TICKS_PER_SECOND:20, // doesnt really affect this game cus its turn based
	TURN_TIME_IN_SECONDS:30,
	KICK_TIME_IN_SECONDS:5,
	TIME_OUT_TURN_COUNT:3
}

module.exports = config
