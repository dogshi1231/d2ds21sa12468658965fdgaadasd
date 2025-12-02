function hasHigherRole(member, roleName) {
  if (!member || !member.guild) return false;
  const staffRole = member.guild.roles.cache.find(r => r.name.toLowerCase() === String(roleName).toLowerCase());
  if (!staffRole) return false; // fail closed if Staff not found
  const highest = member.roles.highest || member.guild.roles.everyone;
  return highest.position > staffRole.position;
}

module.exports = { hasHigherRole };
