# 🎫 Enhanced Ticket Claim System Documentation

## Overview

The enhanced ticket claim system provides advanced permission locking and automatic unclaiming when staff become inactive, ensuring optimal ticket response times.

## Features

✅ **Permission Locking** - When claimed, only the staff member and customer can see/speak  
✅ **Auto-Unclaim** - Automatically unclaims tickets after 10 minutes of staff inactivity  
✅ **Activity Tracking** - Monitors staff responses and customer messages  
✅ **Persistent Storage** - Claims saved to `data/ticket-claims.json`  
✅ **Automatic Cleanup** - Old claims cleaned up after 24 hours  
✅ **Seamless Integration** - Works with existing Discord Tickets buttons  

---

## How It Works

### Claim Flow

```
1. Staff clicks "Claim" button
   ↓
2. Default ticket claim executes
   ↓
3. Enhanced permissions lock applied:
   - Hide channel from all staff roles
   - Hide channel from @everyone
   - Show only to claiming staff + customer
   - Both can send messages
   ↓
4. Claim saved with timestamp
   ↓
5. Staff and customer can now communicate privately
```

### Auto-Unclaim Flow

```
1. Customer sends message in claimed ticket
   ↓
2. System checks: Has staff responded recently?
   ↓
3. If NO → Start 10-minute timer
   ↓
4. Staff has 10 minutes to respond
   ↓
5. If staff responds → Timer cancelled ✅
   ↓
6. If 10 minutes pass with no response:
   - Auto-unclaim triggered
   - Permissions restored
   - Notification sent to channel
   - Ticket available for other staff
```

---

## Permission Structure

### Before Claim (Normal Ticket)
```
@everyone: ❌ View Channel
Staff Role: ✅ View, Send, Manage
Customer: ✅ View, Send
```

### After Claim (Locked)
```
@everyone: ❌ View Channel
Staff Role: ❌ View Channel (hidden from all staff)
Claiming Staff: ✅ View, Send, Manage
Customer: ✅ View, Send
```

### After Unclaim (Restored)
```
@everyone: ❌ View Channel
Staff Role: ✅ View, Send, Manage (restored)
Customer: ✅ View, Send
```

---

## Data Structure

### `data/ticket-claims.json`

```json
{
  "1234567890123456789": {
    "staffId": "987654321098765432",
    "staffTag": "StaffMember#1234",
    "claimedAt": "2025-11-11T22:00:00.000Z",
    "lastStaffMessage": "2025-11-11T22:05:00.000Z",
    "customerId": "111222333444555666",
    "active": true,
    "autoUnclaimScheduled": false,
    "autoUnclaimScheduledAt": "2025-11-11T22:10:00.000Z"
  }
}
```

**Fields Explained:**
- `staffId` - Discord ID of staff who claimed
- `staffTag` - Username#discriminator for logging
- `claimedAt` - ISO timestamp of claim
- `lastStaffMessage` - Last time staff responded
- `customerId` - Ticket creator's Discord ID
- `active` - Whether claim is currently active
- `autoUnclaimScheduled` - Whether auto-unclaim timer is running
- `autoUnclaimScheduledAt` - When auto-unclaim was scheduled
- `unclaimedAt` - When ticket was unclaimed (if inactive)
- `unclaimReason` - Why it was unclaimed

---

## Activity Timeline Example

```
00:00 - Staff claims ticket
00:01 - Customer: "I have a question"
        → Auto-unclaim timer starts (10 min)
00:03 - Staff: "Sure, what's up?"
        → Timer cancelled
00:05 - Customer: "Another question"
        → New timer starts (10 min)
00:10 - (5 minutes pass, no staff response)
00:15 - (10 minutes total)
        → AUTO-UNCLAIM TRIGGERED
        → Permissions restored
        → Staff notified
```

---

## Commands & Buttons

### For Staff

**Claim Ticket:**
- Click "Claim" button in ticket
- Or use `/claim` command (if exists)

**Unclaim Ticket:**
- Click "Unclaim" button in ticket
- Or use `/release` command (if exists)

### Results

**After Claim:**
```
✅ Ticket Claimed
✅ Only you and the customer can see this channel
✅ Other staff members are now hidden from this ticket
```

**After Manual Unclaim:**
```
✅ Ticket Unclaimed
✅ All staff members can now see this channel again
✅ Ticket is available for claiming
```

**After Auto-Unclaim:**
```
⚠️ Ticket Auto-Unclaimed

This ticket has been automatically unclaimed due to staff inactivity.

@StaffMember did not respond within 10 minutes.

The ticket is now available for other staff members.
```

---

## Configuration

The system uses existing Discord Tickets configuration. No additional setup needed!

Works with:
- `category.claiming` - Enable/disable claiming per category
- `guild.claimButton` - Show/hide claim button
- Staff roles from ticket categories

---

## Integration Points

### File: `src/client.js`
```javascript
// Initialize enhanced ticket claim manager
const TicketClaimManager = require('../custom/ticket-claim-manager');
this.ticketClaimManager = new TicketClaimManager(this);
```

### File: `src/buttons/claim.js`
```javascript
// Use default claim functionality
await client.tickets.claim(interaction);

// Add enhanced claim management
await client.ticketClaimManager.handleClaim(interaction, ticket);
```

### File: `src/buttons/unclaim.js`
```javascript
// Handle enhanced unclaim first
await client.ticketClaimManager.handleUnclaim(interaction, ticket);

// Use default release functionality
await client.tickets.release(interaction);
```

### File: `src/listeners/client/messageCreate.js`
```javascript
// Handle claimed ticket activity for auto-unclaim
if (client.ticketClaimManager) {
    await client.ticketClaimManager.handleMessage(message, ticket);
}
```

---

## API Methods

### `TicketClaimManager`

**Constructor:**
```javascript
new TicketClaimManager(client)
```

**Methods:**

```javascript
// Check if ticket is claimed
isClaimed(channelId) → boolean

// Get claim information
getClaimInfo(channelId) → Object | null

// Handle claim
await handleClaim(interaction, ticket)

// Handle unclaim
await handleUnclaim(interaction, ticket, reason)

// Handle message (for auto-unclaim)
await handleMessage(message, ticket)

// Get statistics
getStats() → { totalClaims, activeClaims, autoUnclaimScheduled }
```

---

## Monitoring & Logging

### Console Logs

**Claim:**
```
[INFO] Ticket 123456789 claimed by StaffUser#1234 - Permissions locked
```

**Staff Response:**
```
[DEBUG] Staff StaffUser#1234 responded in claimed ticket 123456789
```

**Auto-Unclaim Scheduled:**
```
[INFO] Auto-unclaim scheduled for ticket 123456789 in 10 minutes
```

**Auto-Unclaim Executed:**
```
[INFO] Auto-unclaiming ticket 123456789 due to staff inactivity
```

**Auto-Unclaim Cancelled:**
```
[INFO] Auto-unclaim cancelled for ticket 123456789 - staff responded
```

**Cleanup:**
```
[INFO] Cleaned up 5 old ticket claims
```

---

## Statistics

**Get current stats:**
```javascript
const stats = client.ticketClaimManager.getStats();
console.log(stats);
// {
//   totalClaims: 150,
//   activeClaims: 5,
//   autoUnclaimScheduled: 2
// }
```

---

## Troubleshooting

### Permissions Not Locking

**Check 1:** Bot has `Manage Channels` permission  
**Check 2:** Bot's role is above staff roles  
**Check 3:** Channel isn't synced with category permissions  

### Auto-Unclaim Not Working

**Check 1:** Staff is actually responding (check timestamps)  
**Check 2:** Bot is running and not restarted  
**Check 3:** Check console for error logs  

### Claims Not Persisting

**Check 1:** `data/` directory exists and is writable  
**Check 2:** Check console for save errors  
**Check 3:** Verify `data/ticket-claims.json` exists  

---

## Best Practices

### For Staff

1. **Respond Promptly** - Keep the 10-minute window in mind
2. **Unclaim When Done** - Don't leave tickets claimed unnecessarily
3. **Monitor Active Claims** - Don't claim too many at once

### For Administrators

1. **Monitor Logs** - Watch for frequent auto-unclaims (may indicate understaffing)
2. **Adjust Timeout** - 10 minutes can be changed in code if needed
3. **Review Permissions** - Ensure bot has proper role hierarchy

---

## Customization

### Change Auto-Unclaim Timeout

**File:** `custom/ticket-claim-manager.js`  
**Line:** ~247

```javascript
// Change from 10 minutes to 15 minutes
}, 15 * 60 * 1000); // 15 minutes
```

### Change Cleanup Interval

**File:** `custom/ticket-claim-manager.js`  
**Line:** ~314

```javascript
// Change from 24 hours to 48 hours
const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000);
```

### Disable Auto-Unclaim Notification

**File:** `custom/ticket-claim-manager.js`  
**Lines:** ~265-276

Comment out or remove the embed sending code.

---

## Performance

- **Memory Usage:** ~100KB per 1000 active claims
- **CPU Usage:** Minimal (event-driven)
- **Disk Usage:** ~1KB per claim in JSON
- **Timers:** One per claimed ticket with scheduled auto-unclaim

---

## Security

✅ **Permission Validation** - Verifies staff status before claim  
✅ **Role Hierarchy** - Respects Discord's permission system  
✅ **Data Isolation** - Each ticket's permissions are separate  
✅ **Automatic Cleanup** - Prevents data accumulation  
✅ **Error Handling** - Fails gracefully without breaking tickets  

---

## Future Enhancements

Potential improvements:
- [ ] Configurable timeout per category
- [ ] Warning notification at 5 minutes
- [ ] Staff performance analytics
- [ ] Custom auto-unclaim conditions
- [ ] Integration with ticket priorities
- [ ] Multi-staff claiming
- [ ] Claim transfer between staff

---

## Comparison with Default System

| Feature | Default | Enhanced |
|---------|---------|----------|
| **Claim Button** | ✅ Yes | ✅ Yes |
| **Hide Other Staff** | ✅ Yes | ✅ Yes (improved) |
| **Customer Access** | ✅ Yes | ✅ Yes |
| **Auto-Unclaim** | ❌ No | ✅ Yes |
| **Activity Tracking** | ❌ No | ✅ Yes |
| **Inactivity Timeout** | ❌ No | ✅ 10 minutes |
| **Persistent Claims** | ✅ Database | ✅ Database + JSON |
| **Notifications** | ❌ No | ✅ Yes |
| **Permission Lock** | ⚠️ Basic | ✅ Enhanced |

---

## Testing

### Test Claim
1. Create a ticket as customer
2. Staff clicks "Claim"
3. Verify only staff + customer can see channel
4. Verify other staff cannot see channel

### Test Auto-Unclaim
1. Staff claims ticket
2. Customer sends message
3. Wait 10 minutes without staff response
4. Verify auto-unclaim occurs
5. Verify permissions restored
6. Verify notification sent

### Test Cancel Auto-Unclaim
1. Staff claims ticket
2. Customer sends message
3. Staff responds within 10 minutes
4. Verify auto-unclaim cancelled
5. Ticket remains claimed

---

## Support

**Files:**
- Core: `custom/ticket-claim-manager.js`
- Integration: `src/client.js`
- Buttons: `src/buttons/claim.js`, `src/buttons/unclaim.js`
- Listener: `src/listeners/client/messageCreate.js`
- Data: `data/ticket-claims.json`

**Logs:**
- Check console for `[INFO]` and `[DEBUG]` messages
- Watch for "Auto-unclaim" related logs
- Monitor permission errors

---

**Last Updated:** November 11, 2025  
**Feature Status:** ✅ Fully Operational  
**Auto-Unclaim Timeout:** 10 minutes
