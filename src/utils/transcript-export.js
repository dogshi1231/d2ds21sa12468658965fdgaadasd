const fs = require('fs');
const { join } = require('path');
const Mustache = require('mustache');
const { pools } = require('../lib/threads');
const { AttachmentBuilder } = require('discord.js');

const { transcript: pool } = pools;

async function buildTranscriptAttachment(client, ticketId) {
  const ticket = await client.prisma.ticket.findUnique({
    include: {
      archivedChannels: true,
      archivedMessages: { orderBy: { createdAt: 'asc' }, where: { external: false } },
      archivedRoles: true,
      archivedUsers: true,
      category: true,
      claimedBy: true,
      closedBy: true,
      createdBy: true,
      feedback: true,
      guild: true,
      questionAnswers: { include: { question: true } },
    },
    where: { id: ticketId },
  });
  if (!ticket) throw new Error(`Ticket ${ticketId} not found for transcript`);

  Mustache.escape = t => t;
  const templatePath = join('./user/templates/', client.config.templates.transcript + '.mustache');
  const template = fs.readFileSync(templatePath, { encoding: 'utf8' });

  const processed = await pool.queue(w => w(ticket));
  const channelName = processed.category.channelName
    .replace(/{+\s?(user)?name\s?}+/gi, processed.createdBy?.username)
    .replace(/{+\s?(nick|display)(name)?\s?}+/gi, processed.createdBy?.displayName)
    .replace(/{+\s?num(ber)?\s?}+/gi, processed.number);

  const fileName = `${channelName}.${client.config.templates.transcript.split('.').slice(-1)[0]}`;
  const transcript = Mustache.render(template, {
    channelName,
    closedAtFull: function () {
      return new Intl.DateTimeFormat([processed.guild.locale, 'en-GB'], { dateStyle: 'full', timeStyle: 'long', timeZone: 'Etc/UTC' }).format(this.closedAt);
    },
    createdAtFull: function () {
      return new Intl.DateTimeFormat([processed.guild.locale, 'en-GB'], { dateStyle: 'full', timeStyle: 'long', timeZone: 'Etc/UTC' }).format(this.createdAt);
    },
    createdAtTimestamp: function () {
      return new Intl.DateTimeFormat([processed.guild.locale, 'en-GB'], { dateStyle: 'short', timeStyle: 'long', timeZone: 'Etc/UTC' }).format(this.createdAt);
    },
    guildName: client.guilds.cache.get(processed.guildId)?.name,
    pinned: processed.pinnedMessageIds.join(', '),
    ticket: processed,
  });

  const attachment = new AttachmentBuilder().setFile(Buffer.from(transcript)).setName(fileName);
  return { attachment, fileName };
}

module.exports = { buildTranscriptAttachment };
