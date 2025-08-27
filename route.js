const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const User = require('./models/User');
// const db = require('./db').default;

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
//, authMiddleware

// router.get('/', authMiddleware, async (_req, res) => {
//   const users = await db.query('SELECT * FROM users');
//   console.log(users);
//   res.send(users.rows[0]);
// });

router.get('/', async (req, res) => {
  try {
    const userId = 'yPfLqETrkZ92xDA368GK3'; // получаем идентификатор текущего пользователя

    // Получаем информацию о пользователе
    let userInfoQuery = await db.query('SELECT * FROM users WHERE id=$1', [
      userId,
    ]);
    console.log(userInfoQuery.rows[0]);
    const user = userInfoQuery.rows[0];
    delete user.password_hash;

    // Получаем список чатов, в которых пользователь состоит
    let chatsQuery = await db.query('SELECT * FROM chat_participants');
    //c INNER JOIN chat_participants cp ON c.id=cp.chat_id
    const chats = chatsQuery.rows[0];

    // // Получаем список друзей
    // let friendsQuery = ` SELECT f.target_id, u.username FROM friends_list f LEFT JOIN users u ON f.target_id=u.id WHERE f.requestor_id=$1 AND f.accepted=true; `;
    // const friendsResult = await db.query(friendsQuery, [userId]);
    // const friends = friendsResult.rows;

    // // Получаем черный список
    // let blacklistQuery = `SELECT b.blocked_user_id, u.username FROM blacklist b LEFT JOIN users u ON b.blocked_user_id=u.id WHERE b.blocker_id=$1; `;
    // const blacklistResult = await db.query(blacklistQuery, [userId]);
    // const blacklist = blacklistResult.rows;

    // // Формируем финальный ответ
    const responseData = {
      user,
      chats,
      //   // friends,
      //   // blacklist,
    };

    res.status(200).json(user);
  } catch (error) {
    console.log(error);
  }
});
//authMiddleware,
router.get('/:id', async (req, res) => {
  const userId = req.params.id;
  console.log(userId);
  const currentUser = await db.query('SELECT * FROM users where id = $1', [
    userId,
  ]);
  res.send(currentUser.rows[0]);
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const currentUser = await User.findByLogin(login);
    if (!currentUser) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }
    const validPassword = await bcrypt.compare(
      password,
      currentUser.password_hash
    );
    if (!validPassword) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }
    await User.updateOnlineStatus(currentUser.id, true);
    req.session.user_id = currentUser.id;
    req.session.authenticated = true;
    const { password_hash, ...userWithoutPassword } = currentUser;
    console.log(req.session.authenticated);
    return res.status(200).json({
      message: `Мы скучали, ${currentUser.name}`,
      auth: req.session.authenticated,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    return res
      .status(500)
      .json({ message: 'Что-то пошло не так. Пожалуйста, попробуйте снова.' });
  }
});

module.exports = router;
