const { SlashCommand } = require('@eartharoid/dbf');
const { ApplicationCommandOptionType, MessageFlags, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../lib/users');
const { logSellhubEvent } = require('../../utils/sellhub-log');

module.exports = class SellhubSlashCommand extends SlashCommand {
  constructor(client, options) {
    const name = 'sellhub';
    super(client, {
      ...options,
      description: 'Sellhub management',
      dmPermission: false,
      name,
      options: [
        // Products
        {
          name: 'products',
          description: 'Manage products',
          type: ApplicationCommandOptionType.SubcommandGroup,
          options: [
            { name: 'list', description: 'List products', type: ApplicationCommandOptionType.Subcommand },
            { name: 'create', description: 'Create a product', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'name', description: 'Product name', type: ApplicationCommandOptionType.String, required: true },
              { name: 'price', description: 'Price (USD)', type: ApplicationCommandOptionType.Number, required: true },
            ]},
            { name: 'delete', description: 'Delete a product', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'id', description: 'Product ID', type: ApplicationCommandOptionType.String, required: true },
            ]},
            { name: 'update', description: 'Update a product', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'id', description: 'Product ID', type: ApplicationCommandOptionType.String, required: true },
              { name: 'name', description: 'New name', type: ApplicationCommandOptionType.String, required: false },
              { name: 'price', description: 'New price (USD)', type: ApplicationCommandOptionType.Number, required: false },
            ]},
          ],
        },
        // Coupons
        {
          name: 'coupons',
          description: 'Manage coupons',
          type: ApplicationCommandOptionType.SubcommandGroup,
          options: [
            { name: 'list', description: 'List coupons', type: ApplicationCommandOptionType.Subcommand },
            { name: 'create', description: 'Create a coupon', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'code', description: 'Coupon code', type: ApplicationCommandOptionType.String, required: true },
              { name: 'percent', description: 'Discount percent', type: ApplicationCommandOptionType.Integer, required: true },
            ]},
            { name: 'delete', description: 'Delete a coupon', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'id', description: 'Coupon ID', type: ApplicationCommandOptionType.String, required: true },
            ]},
          ],
        },
        // Variants
        {
          name: 'variants',
          description: 'Manage product variants',
          type: ApplicationCommandOptionType.SubcommandGroup,
          options: [
            { name: 'list', description: 'List variants for a product', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'product_id', description: 'Product ID', type: ApplicationCommandOptionType.String, required: true },
            ]},
            { name: 'restock', description: 'Add stock to a variant', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'variant_id', description: 'Variant ID', type: ApplicationCommandOptionType.String, required: true },
              { name: 'quantity', description: 'Quantity to add', type: ApplicationCommandOptionType.Integer, required: true },
            ]},
            { name: 'remove', description: 'Remove all stock from a variant', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'variant_id', description: 'Variant ID', type: ApplicationCommandOptionType.String, required: true },
            ]},
            { name: 'delete', description: 'Delete a variant', type: ApplicationCommandOptionType.Subcommand, options: [
              { name: 'variant_id', description: 'Variant ID', type: ApplicationCommandOptionType.String, required: true },
            ]},
          ],
        },
        // Invoices (orders)
        {
          name: 'invoices',
          description: 'List recent invoices',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            { name: 'limit', description: 'Max invoices to show', type: ApplicationCommandOptionType.Integer, required: false },
          ],
        },
        { name: 'invoice', description: 'Invoice actions', type: ApplicationCommandOptionType.SubcommandGroup, options: [
          { name: 'refund', description: 'Refund an invoice', type: ApplicationCommandOptionType.Subcommand, options: [ { name: 'id', description: 'Invoice ID', type: ApplicationCommandOptionType.String, required: true } ] },
          { name: 'replace', description: 'Replace items on an invoice', type: ApplicationCommandOptionType.Subcommand, options: [ { name: 'id', description: 'Invoice ID', type: ApplicationCommandOptionType.String, required: true }, { name: 'items_json', description: 'Items JSON payload', type: ApplicationCommandOptionType.String, required: true } ] },
          { name: 'complete', description: 'Mark an invoice as complete', type: ApplicationCommandOptionType.Subcommand, options: [ { name: 'id', description: 'Invoice ID', type: ApplicationCommandOptionType.String, required: true } ] },
        ]},
        // Customers
        { name: 'customers', description: 'List customers', type: ApplicationCommandOptionType.Subcommand, options: [ { name: 'limit', description: 'Max customers to show', type: ApplicationCommandOptionType.Integer, required: false } ] },
        { name: 'customer', description: 'Get a customer by ID', type: ApplicationCommandOptionType.Subcommand, options: [ { name: 'id', description: 'Customer ID', type: ApplicationCommandOptionType.String, required: true } ] },
        { name: 'test', description: 'Verify API key and show store info', type: ApplicationCommandOptionType.Subcommand },
      ],
    });
  }

  async run(interaction) {
    const client = this.client;
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (e) {
      // If defer fails (e.g., already replied), we'll proceed and try to edit later
      client.log.warn('sellhub: failed to defer reply:', e?.message || e);
    }

    // Permission: match standard staff logic (ManageGuild, staff role, or SUPER)
    if (!(await isStaff(interaction.guild, interaction.member.id))) {
      return interaction.editReply('You do not have permission to use this Sellhub command.');
    }
    if (!client.sellhub) return interaction.editReply('❌ Sellhub API is not configured.');

    try {
      const group = interaction.options.getSubcommandGroup(false);
      const sub = interaction.options.getSubcommand(false);

      // PRODUCTS
      if (group === 'products') {
        if (sub === 'list') {
          const res = await client.sellhub.getProducts({ limit: 10 });
          const items = Array.isArray(res) ? res : (res?.data || []);
          const embed = new EmbedBuilder().setColor(0x3498DB).setTitle('Products');
          if (!items.length) embed.setDescription('No products found.');
          else embed.setDescription(items.slice(0, 10).map(p => `• ${p.name || p.title || 'Unnamed'} (ID: ${p.id || 'n/a'})`).join('\n'));
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        if (sub === 'create') {
          const name = interaction.options.getString('name', true);
          const price = interaction.options.getNumber('price', true);
          const payload = { name, priceCents: Math.round(price * 100) };
          const created = await client.sellhub.createProduct(payload);
          await logSellhubEvent(client, 'Product Created', interaction.user, { id: created?.id, payload });
          const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle('Product Created Successfully').addFields(
            { name: 'Name', value: name, inline: true },
            { name: 'Price', value: `$${price.toFixed(2)}`, inline: true },
            { name: 'ID', value: String(created?.id || 'unknown'), inline: true },
          );
          return interaction.editReply({ embeds: [embed] });
        }
        if (sub === 'delete') {
          const id = interaction.options.getString('id', true);
          await client.sellhub.deleteProduct(id);
          await logSellhubEvent(client, 'Product Deleted', interaction.user, { id });
          return interaction.editReply({ content: `✅ Deleted product ${id}` });
        }
        if (sub === 'update') {
          const id = interaction.options.getString('id', true);
          const name = interaction.options.getString('name', false);
          const price = interaction.options.getNumber('price', false);
          const payload = {};
          if (name) payload.name = name;
          if (price != null) payload.priceCents = Math.round(price * 100);
          const updated = await client.sellhub.updateProduct(id, payload);
          await logSellhubEvent(client, 'Product Updated', interaction.user, { id, payload });
          const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle('Product Updated').addFields(
            { name: 'ID', value: id, inline: true },
            ...(name ? [{ name: 'Name', value: name, inline: true }] : []),
            ...(price != null ? [{ name: 'Price', value: `$${price.toFixed(2)}`, inline: true }] : []),
          );
          return interaction.editReply({ embeds: [embed] });
        }
      }

      // COUPONS
      if (group === 'coupons') {
        if (sub === 'list') {
          const items = await client.sellhub.getCoupons();
          const list = Array.isArray(items) ? items : (items?.data || []);
          const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('Coupons');
          embed.setDescription(list.slice(0, 20).map(c => `• ${c.code || c.id} (${c.percent || c.discount || 0}% off)`).join('\n') || 'No coupons.');
          return interaction.editReply({ embeds: [embed] });
        }
        if (sub === 'create') {
          const code = interaction.options.getString('code', true);
          const percent = interaction.options.getInteger('percent', true);
          const payload = { code, percent };
          const created = await client.sellhub.createCoupon(payload);
          await logSellhubEvent(client, 'Coupon Created', interaction.user, { id: created?.id, payload });
          return interaction.editReply({ content: `✅ Coupon ${code} (${percent}% off) created.` });
        }
        if (sub === 'delete') {
          const id = interaction.options.getString('id', true);
          await client.sellhub.deleteCoupon(id);
          await logSellhubEvent(client, 'Coupon Deleted', interaction.user, { id });
          return interaction.editReply({ content: `✅ Coupon ${id} deleted.` });
        }
      }

      // VARIANTS
      if (group === 'variants') {
        if (sub === 'list') {
          const productId = interaction.options.getString('product_id', true);
          const list = await client.sellhub.getVariants(productId);
          const items = Array.isArray(list) ? list : (list?.data || []);
          const embed = new EmbedBuilder().setColor(0x34495E).setTitle('Variants');
          embed.setDescription(items.slice(0, 20).map(v => `• ${v.name || v.id} (ID: ${v.id || 'n/a'})`).join('\n') || 'No variants');
          return interaction.editReply({ embeds: [embed] });
        }
        if (sub === 'restock') {
          const variant_id = interaction.options.getString('variant_id', true);
          const quantity = interaction.options.getInteger('quantity', true);
          const payload = { quantity };
          await client.sellhub.restockVariant(variant_id, payload);
          await logSellhubEvent(client, 'Variant Restocked', interaction.user, { id: variant_id, payload });
          return interaction.editReply({ content: `✅ Restocked variant ${variant_id} by ${quantity}.` });
        }
        if (sub === 'remove') {
          const variant_id = interaction.options.getString('variant_id', true);
          await client.sellhub.removeAllStock(variant_id);
          await logSellhubEvent(client, 'Variant Stock Removed', interaction.user, { id: variant_id });
          return interaction.editReply({ content: `✅ Removed all stock from variant ${variant_id}.` });
        }
        if (sub === 'delete') {
          const variant_id = interaction.options.getString('variant_id', true);
          await client.sellhub.deleteVariant(variant_id);
          await logSellhubEvent(client, 'Variant Deleted', interaction.user, { id: variant_id });
          return interaction.editReply({ content: `✅ Variant ${variant_id} deleted.` });
        }
      }

      // INVOICES (list)
      if (!group && sub === 'invoices') {
        const limit = interaction.options.getInteger('limit', false) || 10;
        const res = await client.sellhub.getInvoices({ limit });
        const items = Array.isArray(res) ? res : (res?.data || []);
        const embed = new EmbedBuilder().setColor(0x16A085).setTitle('Recent Invoices');
        embed.setDescription(items.slice(0, limit).map(inv => `• ${inv.id || 'n/a'} - $${((inv.totalCents||0)/100).toFixed(2)}`).join('\n') || 'No invoices.');
        return interaction.editReply({ embeds: [embed] });
      }

      // INVOICE actions
      if (group === 'invoice') {
        const id = interaction.options.getString('id', true);
        if (sub === 'refund') {
          await client.sellhub.refundInvoice(id);
          await logSellhubEvent(client, 'Invoice Refunded', interaction.user, { id });
          return interaction.editReply({ content: `✅ Refunded invoice ${id}.` });
        }
        if (sub === 'complete') {
          await client.sellhub.completeInvoice(id);
          await logSellhubEvent(client, 'Invoice Completed', interaction.user, { id });
          return interaction.editReply({ content: `✅ Completed invoice ${id}.` });
        }
        if (sub === 'replace') {
          const items_json = interaction.options.getString('items_json', true);
          let payload;
          try { payload = JSON.parse(items_json); } catch { return interaction.editReply('Invalid items_json. Provide valid JSON.'); }
          await client.sellhub.replaceInvoiceItems(id, payload);
          await logSellhubEvent(client, 'Invoice Items Replaced', interaction.user, { id, payload });
          return interaction.editReply({ content: `✅ Replaced items for invoice ${id}.` });
        }
      }

      // CUSTOMERS
      if (!group && sub === 'customers') {
        const limit = interaction.options.getInteger('limit', false) || 10;
        const res = await client.sellhub.getCustomers({ limit });
        const items = Array.isArray(res) ? res : (res?.data || []);
        const embed = new EmbedBuilder().setColor(0x1ABC9C).setTitle('Customers');
        embed.setDescription(items.slice(0, limit).map(c => `• ${c.email || c.id} (ID: ${c.id || 'n/a'})`).join('\n') || 'No customers.');
        return interaction.editReply({ embeds: [embed] });
      }
      if (!group && sub === 'customer') {
        const id = interaction.options.getString('id', true);
        const c = await client.sellhub.getCustomer(id);
        const embed = new EmbedBuilder().setColor(0x1ABC9C).setTitle('Customer');
        embed.addFields(
          { name: 'ID', value: String(c.id || id), inline: true },
          ...(c.email ? [{ name: 'Email', value: String(c.email), inline: true }] : []),
        );
        return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      // TEST
      if (!group && sub === 'test') {
        try {
          const res = await client.sellhub.getInvoices({ limit: 1 });
          const count = Array.isArray(res?.data) ? res.data.length : (Array.isArray(res) ? res.length : 0);
          const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('Sellhub API Key: OK')
            .addFields(
              { name: 'Endpoint', value: 'GET /invoices?limit=1', inline: true },
              { name: 'Items', value: String(count), inline: true },
            )
            .setTimestamp();
          await logSellhubEvent(client, 'API Key Test', interaction.user, { endpoint: '/invoices?limit=1', ok: true });
          return interaction.editReply({ embeds: [embed] });
        } catch (e) {
          const details = {
            status: e?.status,
            scheme: e?.scheme,
            code: e?.code,
            errno: e?.errno,
            syscall: e?.syscall,
            host: e?.hostname,
          };
          await logSellhubEvent(client, 'API Key Test Failed', interaction.user, { error: e?.message || String(e), ...details }, true);
          const isAuth = e?.status === 401 || e?.status === 403;
          const netHint = e?.code === 'ENOTFOUND' ? 'DNS lookup failed' : e?.code === 'ECONNREFUSED' ? 'Connection refused' : e?.code === 'ETIMEDOUT' ? 'Network timeout' : '';
          const reason = isAuth ? 'Unauthorized: Check API key format/value' : (netHint || e?.data?.message || e?.message || 'Failed');
          const suffix = [details.code, details.host].filter(Boolean).join(' · ');
          return interaction.editReply({ content: `❌ ${reason}${suffix ? ` (${suffix})` : ''}` });
        }
      }

      return interaction.editReply('Unknown subcommand.');

    } catch (err) {
      this.client.log.error('sellhub error:', err);
      await logSellhubEvent(this.client, 'Error', interaction.user, { error: err?.message || String(err) }, true);
      const msg = err?.data?.message || err.message || 'Failed.';
      return interaction.editReply('❌ ' + msg);
    }
  }
}
