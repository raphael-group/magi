var ids = {
	google: {
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURLSuffix: "auth/google/callback"
	}
}

module.exports = ids
