const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('./models/User');
const db = require('./models/db').default;
const Chat = require('./models/Chat');
const Blacklist = require('./models/BlackList');
const Message = require('./models/Message');
const upload = require('./middleware/upload');
const fs = require('fs');

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
    const loginExists = await User.checkLoginExists(login);

    if (loginExists) {
      return res.status(409).json('Неверный логин, попробуйте другой');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userData = { name, login, passwordHash, image: null };

    const user = await User.createUser(userData);
    const { password_hash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: `Добро пожаловать, ${name}`,
      user: userWithoutPassword,
    });
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
router.get('/:user_id', async (req, res) => {
  const id = req.params.user_id;
  const userChats = await Chat.getUserChats(id);
  res.json(userChats);
});
//, authMiddleware
router.get('/:chat_id/user/:user_id', async (req, res) => {
  try {
    const { chat_id, user_id } = req.params;
    console.log(chat_id, user_id, 'im here');
    const currentUser = await Chat.getChatInterlocutor(chat_id, user_id);
    res.status(200).json(currentUser);
  } catch (error) {
    res.status(400).json('oops');
  }
});
router.get('/search/:searchValue', async (req, res) => {
  try {
    const name = req.params.searchValue;

    const searchUsers = await User.searchByName(name);

    res.status(200).json(searchUsers);
  } catch (error) {
    res.status(404).json('sorry...');
  }
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
router.get('/blacklist/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const usersBlackList = await Blacklist.getBlacklist(user_id);
    res.status(200).json(usersBlackList);
  } catch (error) {
    res.status(500).json(error, 'Error');
  }
});
router.post('/blacklist_add', async (req, res) => {
  try {
    const { user_id, blocked_user_id } = req.body;

    await Blacklist.addToBlacklist(user_id, blocked_user_id);

    res.status(200).json('success!');
  } catch (error) {
    res.status(500).json(error, 'Error');
  }
});
router.get('/chat/:chat_id', async (req, res) => {
  try {
    const { chat_id } = req.params;
    const arrayMessage = await Message.getChatMessages(chat_id);

    res.status(200).json(arrayMessage);
  } catch (error) {
    res.status(500).json(error, 'Error get chat');
  }
});

router.delete(
  '/delete_user_blacklist/:user_id/:blocked_user_id',
  async (req, res) => {
    try {
      const { user_id, blocked_user_id } = req.params;
      await Blacklist.removeFromBlacklist(user_id, blocked_user_id);
      res.status(200).json('success!');
    } catch (error) {
      res.status(500).json(error, 'Unblock error');
    }
  }
);
router.delete('/delete_chat/:chat_id', async (req, res) => {
  try {
    const { chat_id } = req.params;
    await Chat.deleteUserChat(chat_id);
    res.status(200).json('success!');
  } catch (error) {
    res.status(500).json(error, 'phh nooo');
  }
});
router.post('/start-chat', async (req, res) => {
  try {
    const { user1_id, user2_id } = req.body;

    const chat = await Chat.findOrCreatePrivateChat(user1_id, user2_id);
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!user_id) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'User ID is required' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await User.updateAvatar(user_id, avatarUrl);

    res.json({
      success: true,
      avatarUrl: avatarUrl,
      user: updatedUser,
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message, details: error.message });
  }
});

module.exports = router;
