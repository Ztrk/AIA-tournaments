const express = require('express');
const Tournament = require('./tournament');
const router = express.Router();

class Page {
    constructor(number, active = false, disabled = false) {
        this.number = number;
        this.active = active;
        this.disabled = disabled;
    }
}

router.get('/', async (req, res) => {
    const itemsPerPage = 10;
    let page = 1
    if (req.query.page) {
        const parsed = parseInt(req.query.page, 10);
        if (!isNaN(parsed) && parsed > 0) {
            page = parsed;
        }
    }

    try {
        let numPages = Math.ceil((await Tournament.estimatedDocumentCount()) / 10);
        page = Math.min(page, numPages);

        const pages = { 
            previous: new Page(page - 1),
            next: new Page(page + 1), 
            pages: []
        };
        if (pages.previous.number < 1) {
            pages.previous.disabled = true;
        }
        if (pages.next.number > numPages) {
            pages.next.disabled = true;
        }

        for (let i = Math.max(1, Math.min(page - 2, numPages - 4)), j = Math.min(i + 4, numPages); i <= j; ++i) {
            pages.pages.push(new Page(i, i == page));
        }

        const tournaments = await Tournament.find().sort({ name: 'asc'})
            .skip((page - 1) * itemsPerPage).limit(itemsPerPage);
        res.render('index', { tournaments, pages, user: req.session.user });
    }
    catch (error) {
        console.log(error);
    }
});

module.exports = router;
