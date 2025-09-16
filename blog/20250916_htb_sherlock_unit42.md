---
slug: htb-sherlock-unit42
title: 'HTB Sherlock: Unit42'
authors: [cielo]
date: 2025-09-16
tags: [security, hack-the-box, tutorial, dfir]
---

This post covers the **Unit42** Sherlock, a challenge inspired by a real-world UltraVNC campaign researched by Palo Alto's Unit42 team.

In this investigation, I'll be diving into Sysmon logs and analyzing various Event IDs to trace malicious activities on a compromised Windows system.

<!--truncate-->

## Getting Started

After downloading and unzipping `unit42.zip`, there's a Windows event log file: `Microsoft-Windows-Sysmon-Operational.evtx`.

Since I'm working on macOS, I needed a tool to parse this file. I used `evtx_dump` for this - after installing it via Homebrew (`brew install evtx`), I converted the log file into a more manageable JSON Lines format.

```bash
evtx_dump -o json <path/to/your_file.evtx> > output.jsonl
```

With the `output.jsonl` file ready, time to start digging.

## The Investigation

### T1: How many Event logs are there with Event ID 11?

**Answer:** `56`

Event ID 11 in Sysmon corresponds to "FileCreate" events. Just filtered the `output.jsonl` file for entries where `EventID` is 11 and counted them up.

### T2: What is the malicious process that infected the victim's system?

**Answer:** `C:\Users\CyberJunkie\Downloads\Preventivo24.02.14.exe.exe`

Sysmon Event ID 1 logs process creation. Scanning through these events, I found this suspicious executable:

```json
{
  "EventData": {
    "RuleName": "technique_id=T1204,technique_name=User Execution",
    "UtcTime": "2024-02-14 03:41:56.538",
    "ProcessGuid": "817BDDF3-3684-65CC-2D02-000000001900",
    "ProcessId": 10672,
    "Image": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe",
    "OriginalFileName": "Fattura 2 2024.exe",
    "CommandLine": "\"C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe\""
  }
}
```

The double `.exe.exe` extension is a classic trick - if someone has file extensions hidden in Windows, this would just show up as `Preventivo24.02.14.exe`, looking like a normal executable. Pretty sneaky.

### T3: Which Cloud drive was used to distribute the malware?

**Answer:** `Dropbox`

When you download a file from the internet, Windows adds a `Zone.Identifier` Alternate Data Stream (ADS) to track where it came from. Sysmon logs when this ADS gets created, and the `Contents` field shows the `ReferrerUrl`:

```json
{
  "EventData": {
    "TargetFilename": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe:Zone.Identifier",
    "CreationUtcTime": "2024-02-14 03:41:26.459",
    "Contents": "[ZoneTransfer]  ZoneId=3  ReferrerUrl=https://www.dropbox.com/  HostUrl=https://...dl.dropboxusercontent.com/...",
    "User": "DESKTOP-887GK2L\\CyberJunkie"
  }
}
```

The `ReferrerUrl` clearly points to Dropbox.

### T4: What was the timestamp changed to for the PDF file?

**Answer:** `2024-01-14 08:10:06`

The attacker used timestomping - a defense evasion technique where you change file timestamps to make malicious files blend in. Sysmon's Event ID 2 catches this:

```json
{
  "EventData": {
    "RuleName": "technique_id=T1070.006,technique_name=Timestomp",
    "UtcTime": "2024-02-14 03:41:58.404",
    "Image": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe",
    "TargetFilename": "C:\\Users\\CyberJunkie\\AppData\\Roaming\\...\\~.pdf",
    "CreationUtcTime": "2024-01-14 08:10:06.029",
    "PreviousCreationUtcTime": "2024-02-14 03:41:58.404"
  }
}
```

You can see the file's creation time got backdated by about a month. The `PreviousCreationUtcTime` shows when the file was actually created.

### T5: Where was "once.cmd" created on disk?

**Answer:** `C:\Users\CyberJunkie\AppData\Roaming\Photo and Fax Vn\Photo and vn 1.1.2\install\F97891C\WindowsVolume\Games\once.cmd`

Filtered for "FileCreate" (Event ID 11) events where the target filename is `once.cmd`:

```json
{
  "EventData": {
    "Image": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe",
    "TargetFilename": "C:\\Users\\CyberJunkie\\AppData\\Roaming\\Photo and Fax Vn\\Photo and vn 1.1.2\\install\\F97891C\\WindowsVolume\\Games\\once.cmd",
    "CreationUtcTime": "2024-01-10 18:12:26.458"
  }
}
```

Quite the nested folder structure there. The `TargetFilename` field gives the full path.

### T6: What domain name did it try to connect to?

**Answer:** `www.example.com`

Malware often does a quick DNS lookup to check if there's internet connectivity. Sysmon Event ID 22 logs DNS queries:

```json
{
  "EventData": {
    "UtcTime": "2024-02-14 03:41:56.955",
    "QueryName": "www.example.com",
    "Image": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe"
  }
}
```

`www.example.com` is a safe, well-known domain that's commonly used for connectivity checks.

### T7: Which IP address did the malicious process try to reach out to?

**Answer:** `93.184.216.34`

From the same DNS query event, the `QueryResults` field shows what IP addresses got resolved:

```json
{
  "QueryResults": "::ffff:93.184.216.34;199.43.135.53;2001:500:8f::53;199.43.133.53;2001:500:8d::53;"
}
```

The `::ffff:93.184.216.34` is an IPv4-mapped IPv6 address that corresponds to IPv4 `93.184.216.34`.

### T8: When did the process terminate itself?

**Answer:** `2024-02-14 03:41:58`

I looked for the last activity from this process. While there wasn't a specific Event ID 5 (process termination) log, the last file creation events by this process happened at `03:41:58`:

```json
{
  "EventData": {
    "UtcTime": "2024-02-14 03:41:58.404",
    "Image": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe",
    "TargetFilename": "C:\\Users\\...\\UltraVNC.ini"
  }
}
```

After this timestamp, ProcessId 10672 goes silent, so that's when it terminated.

## Reflections

This Sherlock was a great introduction to Sysmon log analysis. Working with the JSON format made it much easier to grep through and find specific events compared to trying to parse raw Windows event logs.

The timestomping technique in T4 was particularly interesting - I hadn't seen that defense evasion tactic in action before. It's clever how attackers try to make their files look like they've been on the system for a while.

The double `.exe.exe` extension trick is also something I've heard about but never actually seen in logs. It's a good reminder of how social engineering still plays a huge role in getting initial access.

Overall, this challenge does a nice job of walking through a typical malware execution flow: 

:::tip Attack Flow
📥 **Initial download**
➡️
⚙️ **Execution** 
➡️
🕐 **Timestomping for evasion**
➡️
🌐 **Connectivity check**
➡️
📄 **File creation**
➡️
🚀 **Payload deployment**
:::

The Sysmon logs tell a pretty complete story once you know which Event IDs to look for.
