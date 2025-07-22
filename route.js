const express = require('express');
const { users } = require('./users');
const router = express.Router();
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');

const Users = [
  {
    id: 1,
    login: 'Ivan_Ivanov',
    name: 'Ванечка',
    passwordHash:
      '$2b$10$.Bq.fDgS2/MUaUz84hlF7ef.jC3PVQe5K2iYvDOI.G8SsrAieB7v6',
  },
];

router.get('/', (_req, res) => {
  res.send(users);
});
router.get('/:id', (req, res) => {
  const userId = req.params.id;
  const currentUser = users.find((user) => user.id.toString() === userId);
  res.send(currentUser);
});

router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  const currentUser = Users.find((user) => user.login === login);
  if (!currentUser) {
    return res.status(401).json('Неверный логин или пароль');
  }
  const validPassword = await bcrypt.compare(
    password,
    currentUser.passwordHash
  );
  if (!validPassword) {
    return res.status(401).json('Неверный логин или пароль');
  }
  res.status(200).json(`Мы скучали, ${currentUser.name}`);
});

class shemaUser {
  constructor(id, login, passwordHash) {
    this.id = id;
    this.login = login;
    this.name = login;
    this.passwordHash = passwordHash;
  }
}

async function hashPassword(password) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.error('Ошибка при хэше пароля:', err.message);
    throw error;
  }
}
router.post('/registration', async (req, res) => {
  const { login, password } = req.body;
  const passwordHash = await hashPassword(password);
  const id = nanoid();
  const newUser = new shemaUser(id, login, passwordHash);
  Users.push(newUser);
  console.log(Users);
});

module.exports = router;
