import Command from "../../structures/Command";
import CommandContext from "../../structures/CommandContext";
import { ButtonInteraction, Guild, GuildMember, Message, MessageActionRow, MessageButton, Snowflake } from "discord.js";
import { NonDigits } from "../../utils/Regex";
import InfractionsManager from "../../utils/managers/InfractionsManager";
import { MuteType } from "../../utils/types/MuteType";
import BulbBotClient from "../../structures/BulbBotClient";
import DatabaseManager from "../../utils/managers/DatabaseManager";

const infractionsManager: InfractionsManager = new InfractionsManager();
const databaseManager: DatabaseManager = new DatabaseManager();

export default class extends Command {
	constructor(client: BulbBotClient, name: string) {
		super(client, {
			name,
			description: "Unutes the selected user",
			category: "Moderation",
			usage: "<member> [reason]",
			examples: ["unmute 123456789012345678", "unmute 123456789012345678 nice user", "unmute @Wumpus#0000 nice user"],
			argList: ["member:Member"],
			minArgs: 1,
			maxArgs: -1,
			clearance: 50,
			overrides: ["moderation_unmute_timeouts"],
		});
	}

	public async run(context: CommandContext, args: string[]): Promise<void | Message> {
		// await context.guild?.members.fetch();
		const targetID: Snowflake = args[0].replace(NonDigits, "");
		const target: GuildMember | undefined = await this.client.bulbfetch.getGuildMember(context.guild?.members, targetID);
		const muteRole: Snowflake = <Snowflake>await databaseManager.getMuteRole(<Snowflake>context.guild?.id);
		let reason: string = args.slice(1).join(" ");
		let infID: number;

		if (!reason) reason = await this.client.bulbutils.translate("global_no_reason", context.guild?.id, {});
		if (!muteRole) return context.channel.send(await this.client.bulbutils.translate("mute_muterole_not_found", context.guild?.id, {}));
		if (!target)
			return context.channel.send(
				await this.client.bulbutils.translate("global_not_found", context.guild?.id, {
					type: await this.client.bulbutils.translate("global_not_found_types.member", context.guild?.id, {}),
					arg_provided: args[0],
					arg_expected: "member:Member",
					usage: this.usage,
				}),
			);
		if (!target.roles.cache.find(role => role.id === muteRole)) return context.channel.send(await this.client.bulbutils.translate("mute_not_muted", context.guild?.id, { target: target.user }));

		const latestMute: Record<string, any> = <Record<string, any>>await infractionsManager.getLatestMute(<Snowflake>context.guild?.id, target.user.id);
		let confirmMsg: Message;

		if (latestMute) {
			infID = await infractionsManager.unmuteOld(
				this.client,
				<Guild>context.guild,
				MuteType.MANUAL,
				target,
				context.author,
				await this.client.bulbutils.translate("global_mod_action_log", context.guild?.id, {
					action: await this.client.bulbutils.translate("mod_action_types.unmute", context.guild?.id, {}),
					moderator: context.author,
					target: target.user,
					reason: reason,
				}),
				reason,
				muteRole,
			);

			const latestMute: Record<string, any> = <Record<string, any>>await infractionsManager.getLatestMute(<Snowflake>context.guild?.id, target.user.id);
			await infractionsManager.setActive(<Snowflake>context.guild?.id, latestMute["id"], false);

			await context.channel.send(
				await this.client.bulbutils.translate("action_success", context.guild?.id, {
					action: await this.client.bulbutils.translate("mod_action_types.unmute", context.guild?.id, {}),
					target: target.user,
					reason,
					infraction_id: infID,
				}),
			);
		} else {
			const row = new MessageActionRow().addComponents([
				new MessageButton().setStyle("SUCCESS").setLabel("Confirm").setCustomId("confirm"),
				new MessageButton().setStyle("DANGER").setLabel("Cancel").setCustomId("cancel"),
			]);

			confirmMsg = await context.channel.send({
				content: await this.client.bulbutils.translate("unmute_confirm", context.guild?.id, {
					target: target.user,
				}),
				components: [row],
			});

			const collector = confirmMsg.createMessageComponentCollector({ time: 30000 });

			collector.on("collect", async (interaction: ButtonInteraction) => {
				if (interaction.user.id !== context.author.id) {
					return interaction.reply({ content: await this.client.bulbutils.translate("global_not_invoked_by_user", context.guild?.id, {}), ephemeral: true });
				}

				if (interaction.customId === "confirm") {
					await target.roles.remove(muteRole);

					await interaction.update({
						content: await this.client.bulbutils.translate("unmute_special", context.guild?.id, {
							target: target.user,
							reason,
						}),
						components: [],
					});

					collector.stop("clicked");
					return await infractionsManager.deleteInfraction(<Snowflake>context.guild?.id, infID);
				} else {
					collector.stop("clicked");
					return interaction.update({ content: await this.client.bulbutils.translate("global_execution_cancel", context.guild?.id, {}), components: [] });
				}
			});

			collector.on("end", async (interaction: ButtonInteraction, reason: string) => {
				if (reason !== "time") return;

				await confirmMsg.edit({ content: await this.client.bulbutils.translate("global_execution_cancel", context.guild?.id, {}), components: [] });
				return;
			});
		}
	}

	public async _moderation_unmute_timeouts(context: CommandContext, args: string[]): Promise<void | Message> {
		// await context.guild?.members.fetch();
		const targetID: Snowflake = args[0].replace(NonDigits, "");
		const target: GuildMember | undefined = await this.client.bulbfetch.getGuildMember(context.guild?.members, targetID);
		let reason: string = args.slice(1).join(" ");
		let infID: number;

		// @ts-ignore
		if (!Number((context.guild?.me!?.permissions.bitfield & (1n << 40n)) == 1n << 40n)) {
			await context.channel.send(await this.client.bulbutils.translate("global_missing_permissions_bot", context.guild?.id, { missing: "`Moderate Members`" }));
			return;
		}

		if (!reason) reason = await this.client.bulbutils.translate("global_no_reason", context.guild?.id, {});
		if (!target)
			return context.channel.send(
				await this.client.bulbutils.translate("global_not_found", context.guild?.id, {
					type: await this.client.bulbutils.translate("global_not_found_types.member", context.guild?.id, {}),
					arg_provided: args[0],
					arg_expected: "member:Member",
					usage: this.usage,
				}),
			);

		const latestMute: Record<string, any> = <Record<string, any>>await infractionsManager.getLatestMute(<Snowflake>context.guild?.id, target.user.id);
		let confirmMsg: Message;

		if (latestMute) {
			infID = await infractionsManager.unmute(
				this.client,
				<Guild>context.guild,
				MuteType.MANUAL,
				target,
				context.author,
				await this.client.bulbutils.translate("global_mod_action_log", context.guild?.id, {
					action: await this.client.bulbutils.translate("mod_action_types.unmute", context.guild?.id, {}),
					moderator: context.author,
					target: target.user,
					reason: reason,
				}),
				reason,
			);

			const latestMute: Record<string, any> = <Record<string, any>>await infractionsManager.getLatestMute(<Snowflake>context.guild?.id, target.user.id);
			await infractionsManager.setActive(<Snowflake>context.guild?.id, latestMute["id"], false);

			await context.channel.send(
				await this.client.bulbutils.translate("action_success", context.guild?.id, {
					action: await this.client.bulbutils.translate("mod_action_types.unmute", context.guild?.id, {}),
					target: target.user,
					reason,
					infraction_id: infID,
				}),
			);
		} else {
			const row = new MessageActionRow().addComponents([
				new MessageButton().setStyle("SUCCESS").setLabel("Confirm").setCustomId("confirm"),
				new MessageButton().setStyle("DANGER").setLabel("Cancel").setCustomId("cancel"),
			]);

			confirmMsg = await context.channel.send({
				content: await this.client.bulbutils.translate("unmute_confirm", context.guild?.id, {
					target: target.user,
				}),
				components: [row],
			});

			const collector = confirmMsg.createMessageComponentCollector({ time: 30000 });

			collector.on("collect", async (interaction: ButtonInteraction) => {
				if (interaction.user.id !== context.author.id) {
					return interaction.reply({ content: await this.client.bulbutils.translate("global_not_invoked_by_user", context.guild?.id, {}), ephemeral: true });
				}

				if (interaction.customId === "confirm") {
					// @ts-ignore
					this.client.api
						.guilds(context.guild!.id)
						.members(target.id)
						.patch({
							data: { communication_disabled_until: null },
						});

					await interaction.update({
						content: await this.client.bulbutils.translate("unmute_special", context.guild?.id, {
							target: target.user,
							reason,
						}),
						components: [],
					});

					collector.stop("clicked");
					return await infractionsManager.deleteInfraction(<Snowflake>context.guild?.id, infID);
				} else {
					collector.stop("clicked");
					return interaction.update({ content: await this.client.bulbutils.translate("global_execution_cancel", context.guild?.id, {}), components: [] });
				}
			});

			collector.on("end", async (interaction: ButtonInteraction, reason: string) => {
				if (reason !== "time") return;

				await confirmMsg.edit({ content: await this.client.bulbutils.translate("global_execution_cancel", context.guild?.id, {}), components: [] });
				return;
			});
		}
	}
}
