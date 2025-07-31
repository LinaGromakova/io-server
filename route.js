const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');

const db = require('./db').default;

function authMiddleware(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}

router.post('/register', async (req, res) => {
  try {
    const { login, name, password } = req.body;

    const existingUser = await db.query('SELECT * FROM users WHERE login=$1', [
      login,
    ]);

    if (existingUser.rowCount > 0) {
      return res.status(409).json('Неверный логин, попробуйте другой');
    }

    const id = nanoid();
    const passwordHash = await bcrypt.hash(password, 10);

    const newPerson = await db.query(
      'INSERT INTO users (id, login, name, password_hash) values($1,$2,$3,$4) RETURNING *',
      [id, login, name, passwordHash]
    );
    res.json(newPerson.rows[0]);
    res.status(200).json(`Добро пожаловать, ${login}`);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json(
        'Возникли технически шоколадки, пожалуйста, попробуйте позже',
        error
      );
  }
});

router.get('/', authMiddleware, async (_req, res) => {
  const users = await db.query('SELECT * FROM users');
  console.log(users);
  res.send(users.rows[0]);
});
router.get('/:id', authMiddleware, async (req, res) => {
  const userId = req.params.id;
  const currentUser = await db.query('SELECT * FROM users where id = $1', [
    userId,
  ]);
  res.send(currentUser.rows[0]);
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const result = await db.query(
      'SELECT * FROM users WHERE login = $1 LIMIT 1',
      [login]
    );
    const currentUser = result.rows[0];
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }
    const validPassword = await bcrypt.compare(
      password,
      currentUser.password_hash
    );
    if (!validPassword) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    req.session.user_id = currentUser.id;
    req.session.authenticated = true;
    console.log(req.session.authenticated);
    return res.status(200).json({
      message: `Мы скучали, ${currentUser.name}`,
      auth: req.session.authenticated,
    });
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    return res
      .status(500)
      .json({ message: 'Что-то пошло не так. Пожалуйста, попробуйте снова.' });
  }
});

module.exports = router;
