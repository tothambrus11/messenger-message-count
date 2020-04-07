#!/usr/bin/env node

const login = require("facebook-chat-api");
const fs = require("fs");
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function newLogin() {
    return new Promise(async (resolve, reject) => {
        let email = await new Promise(resolve => {
            rl.question("Enter your email address: ", (answer) => resolve(answer));
        });
        let password = await new Promise(resolve => {
            rl.question("Enter your password: ", (answer) => resolve(answer));
        });
        rl.close();

        login({email, password, forceLogin: true}, (err, api) => {
            if (err) reject(err);
            else {
                saveState(api);
                resolve(api);
            }
        });
    });
}

function saveState(api) {
    fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState()));
}

function readState() {
    return JSON.parse(fs.readFileSync('appstate.json', 'utf8'));
}


function autoLogin() {
    return new Promise((resolve, reject) => {
        let appState;
        try {
            appState = readState();
        } catch (e) {
            if(!appState){
                newLogin().then((r) => resolve(r)).catch((e) => reject(e));
            }
        }

        if(appState){
            login({appState, forceLogin: true}, (err, api) => {
                if (err) reject(err);
                else resolve(api);
            });
        }
    });
}


autoLogin().then((api) => {
    let threads = [];

    api.getThreadList(1000, null, [], (err, data) => {
        if (err) return console.error(err);

        data.forEach(val => {
            api.getThreadInfo(val.threadID, (err, info) => {
                threads.push(info);
                if (threads.length === data.length) {
                    let friends = [];
                    let friendThreads = [];

                    threads.forEach(fr => {
                        if (fr && !fr.isGroup && fr.threadID !== "0") {
                            friendThreads.push(fr);
                        }
                    });

                    friendThreads = friendThreads.sort((a, b) => {
                        return b.messageCount - a.messageCount;
                    });

                    friendThreads.forEach(friendThread => {
                        api.getUserInfo(friendThread.threadID, (err, uinfo) => {
                            if (err) {
                                console.log("CUCCHIBA EMIATT: ");
                                console.log(err);
                                friends.push(null);
                            } else if (!uinfo[friendThread.threadID]) {
                                console.log("Cucchiba - info:");
                                console.log(friendThread);
                                friends.push(null);
                            } else {
                                friends.push(uinfo[friendThread.threadID]);
                                friends[friends.length - 1].userID = friendThread.threadID;
                            }

                            if (friends.length === friendThreads.length) {
                                for (let i = 0; i < friendThreads.length; i++) {
                                    let threadID = friendThreads[i].threadID;
                                    let user;
                                    for (const fr of friends) {
                                        //console.log(fr.userID);
                                        if (fr.userID === threadID) {
                                            user = fr;
                                            break;
                                        }
                                    }
                                    Object.assign(friendThreads[i], user);
                                    console.log(`${friendThreads[i].messageCount} üzenet \t<=\t${friendThreads[i].name}`)
                                }
                            }
                        })
                    });
                }
            })
        });
    });
});
