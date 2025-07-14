let users = [];

export const addUser = (user)=> {
    const userName = user.name.trim().toLowerCase();
    const isExist = users.find((user)=> user.name === userName );

    !isExist && users.push(user);
    return users;
}