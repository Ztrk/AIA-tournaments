
module.exports = {
    ensureLoggedIn: function(req, res, next) {
        if (!req.session.user) {
            res.redirect('/login');
            return;
        }
        next();
    },

    ensureNotLoggedIn: function (req, res, next) {
        if (req.session.user) {
            res.redirect('/');
            return;
        }
        next();
    },

    fieldFromMongoError: function (error) {
        return error.toString()
        .split('index: ')[1]
        .split('_')[0]
    }
}
