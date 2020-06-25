
module.exports = {
    ensureLoggedIn: function(req, res, next) {
        if (!req.session.user) {
            res.redirect('/users/login');
            return;
        }
        if (req.session.user.emailVerificationToken) {
            res.redirect('/users/requireConfirmation');
            return;
        }
        next();
    },

    ensureNotConfirmed: function(req, res, next) {
        if (!req.session.user) {
            res.redirect('/users/login');
            return;
        }
        if (!req.session.user.emailVerificationToken) {
            res.redirect('/');
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
