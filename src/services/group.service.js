const createGroup = async (
    db, // SQLite context instance 
    groupName, // string
    members // an array of Person
)=>{
    try {
        const insertGroup = await db.runAsync('INSERT INTO groups (name) VALUES (?);', groupName);
        const groupId = insertGroup.lastInsertRowId;
        const inserNewUser = await db.prepareAsync('INSERT INTO users (name, phone_number) VALUES ($name, $phone_number)');
        const inserGroupMember = await db.prepareAsync('INSERT INTO group_members (group_id, user_id) VALUES ($group_id, $user_id)');
    
        if(Array.isArray(members) && members.length>0){
          for(let i=0; i< members.length; i++){
            let newUser = await inserNewUser.executeAsync({ $name: members[i].name, $phone_number: members[i].phoneNumber})
            console.log('inserNewUser:', newUser.lastInsertRowId, newUser.changes);
            let newMember = await inserGroupMember.executeAsync({ $group_id: groupId, $user_id: newUser.lastInsertRowId});
            console.log('inserGroupMember:', newMember.lastInsertRowId, newMember.changes);
          }
        }
        const resposne = await db.getAllAsync('SELECT * FROM groups');
        const allUsers = await db.getAllAsync('SELECT * FROM users');
        const allMembers = await db.getAllAsync('SELECT * FROM group_members');
        console.log('groups:', resposne);
        console.log('users:', allUsers);
        console.log('members:', allMembers);

        return groupId;

    } catch (error) {
        console.error("Error in createGroup:", error);
        return null;
    }
}

export default {
    createGroup
};