export let users = [
  {
    id: 1,
    image: 'https://i.redd.it/h2yzonu2q9wc1.jpeg',
    name: 'Aaa',
    online: true,
    lastMessage: 'string',
    lastAtCreate: '17:00',
    read: false,
    countMessage: 3,
  },
  {
    id: 2,
    name: 'Ddd',
    online: true,
    lastMessage: 'string',
    lastAtCreate: '17:00',
    read: true,
    countMessage: 0,
  },
  {
    id: 3,
    image:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzdWHcffKPDbUMWEVLor3x7sknODQ7SP-Qmw&s',
    name: 'string',
    online: true,
    lastMessage: 'string',
    lastAtCreate: '17:00',
    read: false,
    countMessage: 8,
  },
  {
    id: 42,
    name: 'ccc',
    online: true,
    lastMessage: 'string',
    lastAtCreate: '17:30',
    read: true,
    countMessage: 0,
  },
  {
    id: 45,
    name: 'ccc',
    online: true,
    lastMessage:
      'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe tempore hic natus, possimus nisi porro doloremque est officia eos error praesentium veritatis ab quisquam labore voluptatum vitae repellat. Fugiat, aliquam!',
    lastAtCreate: '17:30',
    read: true,
    countMessage: 0,
  },
];;

export const addUser = (user)=> {
    const userName = user.name.trim().toLowerCase();
    const isExist = users.find((user)=> user.name === userName );

    !isExist && users.push(user);
    return users;
}