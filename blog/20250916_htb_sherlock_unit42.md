---
slug: htb-sherlock-unit42
title: 'HTB Sherlock: Unit42'
authors: [cielo]
date: 2025-09-16
tags: [security, hack-the-box, tutorial, dfir]
---

This post covers the **Unit42** Sherlock, a challenge inspired by a real-world UltraVNC campaign researched by Palo Alto's Unit42 team.

In this investigation, we will familiarize ourselves with Sysmon logs and analyze various Event IDs to trace malicious activities on a compromised Windows system.

## Getting Started

After downloading and unzipping `unit42.zip`, we get a Windows event log file: `Microsoft-Windows-Sysmon-Operational.evtx`.

Since we are working on macOS, we need a tool to parse this file. We can use `evtx_dump` for this. After installing it via Homebrew (`brew install evtx`), we can convert the log file into a more manageable JSON Lines format.

```bash
evtx_dump -o json <path/to/your_file.evtx> > output.jsonl
```

With our `output.jsonl` file ready, we can begin the investigation.

## The Investigation

### T1: How many Event logs are there with Event ID 11?

**Answer:** `56`

Event ID 11 in Sysmon corresponds to "FileCreate" events. By filtering our `output.jsonl` file for entries where the `EventID` is 11, we can count the total number of files created during the logged timeframe.

### T2: What is the malicious process that infected the victim's system?

**Answer:** `C:\Users\CyberJunkie\Downloads\Preventivo24.02.14.exe.exe`

Sysmon Event ID 1 logs process creation. By searching through these events, we identified a suspicious executable.

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

The file path uses double backslashes (`\\`) because this is how backslashes are escaped in JSON strings. The double `.exe.exe` extension is a common trick used by attackers to deceive users who might have file extensions hidden, making the file appear as `Preventivo24.02.14.exe`.

### T3: Which Cloud drive was used to distribute the malware?

**Answer:** `Dropbox`

When a file is downloaded from the internet, Windows often adds a `Zone.Identifier` Alternate Data Stream (ADS) to it. This stream contains metadata about the file's origin. Sysmon logs the creation of this ADS, and by examining the `Contents` field, we can find the `ReferrerUrl`.

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

The `ReferrerUrl` clearly points to `https://www.dropbox.com/`.

### T4: What was the timestamp changed to for the PDF file?

**Answer:** `2024-01-14 08:10:06`

The attacker used a defense evasion technique called "Time Stomping" to make malicious files look older and blend in with legitimate ones. Sysmon's Event ID 2 ("A process changed a file creation time") helps us detect this.

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

The log shows that the file's creation time (`CreationUtcTime`) was changed to a date one month in the past. The original, true creation time is preserved in the `PreviousCreationUtcTime` field.

### T5: Where was "once.cmd" created on disk?

**Answer:** `C:\Users\CyberJunkie\AppData\Roaming\Photo and Fax Vn\Photo and vn 1.1.2\install\F97891C\WindowsVolume\Games\once.cmd`

By filtering for "FileCreate" (Event ID 11) events where the target filename is `once.cmd`, we can find its full creation path.

```json
{
  "EventData": {
    "Image": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe",
    "TargetFilename": "C:\\Users\\CyberJunkie\\AppData\\Roaming\\Photo and Fax Vn\\Photo and vn 1.1.2\\install\\F97891C\\WindowsVolume\\Games\\once.cmd",
    "CreationUtcTime": "2024-01-10 18:12:26.458"
  }
}
```
The `TargetFilename` field gives us the exact location.

### T6: What domain name did it try to connect to?

**Answer:** `www.example.com`

Malware often performs a DNS query for a well-known, non-malicious domain to check for internet connectivity. Sysmon Event ID 22 ("DnsQuery") logs these requests.

```json
{
  "EventData": {
    "UtcTime": "2024-02-14 03:41:56.955",
    "QueryName": "www.example.com",
    "Image": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe"
  }
}
```
The `QueryName` field shows the process queried for `www.example.com`.

### T7: Which IP address did the malicious process try to reach out to?

**Answer:** `93.184.216.34`

The `QueryResults` field from the same DNS query event shows the IP addresses resolved for the domain.

```json
{
  "QueryResults": "::ffff:93.184.216.34;199.43.135.53;2001:500:8f::53;199.43.133.53;2001:500:8d::53;"
}
```
The result `::ffff:93.184.216.34` is an IPv4-mapped IPv6 address, which directly corresponds to the IPv4 address `93.184.216.34`.

### T8: When did the process terminate itself?

**Answer:** `2024-02-14 03:41:58`

We can determine the process termination time by finding the last recorded activity from that process. Sysmon Event ID 5 logs process termination, but in its absence, the timestamp of the last known action serves as a strong indicator. The last file creation events by this process occurred at `03:41:58`.

```json
{
  "EventData": {
    "UtcTime": "2024-02-14 03:41:58.404",
    "Image": "C:\\Users\\CyberJunkie\\Downloads\\Preventivo24.02.14.exe.exe",
    "TargetFilename": "C:\\Users\\...\\UltraVNC.ini"
  }
}
```
After this time, we see no further activity from `ProcessId: 10672`, indicating it had terminated.