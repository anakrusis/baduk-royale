// SERVER CONFIG, neccessary to run the server

config = {
	PORT:23456,
	BOARD_WIDTH:4,
	BOARD_HEIGHT:3,
	MAX_PLAYERS:16,
	TICKS_PER_SECOND:20, // doesnt really affect this game cus its turn based
	TURN_TIME_IN_SECONDS:5,
	TIME_OUT_TURN_COUNT:3
}

module.exports = config
