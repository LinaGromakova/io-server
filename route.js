const express = require('express');
const { users } = require('./users');
const router = express.Router();

router.get("/", (_req,res)=> {
    res.send(users);
})
router.get('/:id', (req,res) => {
    const userId = req.params.id;
    const currentUser = users.find(user => user.id.toString() === userId);
    res.send(currentUser);
})

module.exports = router;