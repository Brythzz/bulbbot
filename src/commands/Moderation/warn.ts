import Command from "../../structures/Command";
import CommandContext from "../../structures/CommandContext";
import { GuildMember, Snowflake } from "discord.js";
import InfractionsManager from "../../utils/managers/InfractionsManager";
import { NonDigits } from "../../utils/Regex";
import BulbBotClient from "../../structures/BulbBotClient";
import ResolveCommandOptions from "../../utils/types/ResolveCommandOptions";

const infractionsManager: InfractionsManager = new InfractionsManager();

export default class extends Command {
	constructor(client: BulbBotClient, name: string) {
		super(client, {
			name,
			description: "Warns the selected guild member",
			category: "Moderation",
			usage: "<member> [reason]",
			examples: ["warn 123456789012345678", "warn 123456789012345678 rude user", "warn @Wumpus#0000 rude user"],
			argList: ["member:Member"],
			minArgs: 1,
			maxArgs: -1,
			clearance: 50,
			userPerms: ["MANAGE_ROLES"],
		});
	}

	async run(context: CommandContext, args: string[]): Promise<void> {
		//Variable declarations
		const targetID: Snowflake = args[0].replace(NonDigits, "");
		const target: GuildMember = <GuildMember>await context.guild?.members.fetch(targetID);
		const reason: string = args.slice(1).join(" ") || await this.client.bulbutils.translate("global_no_reason", context.guild?.id, {});
		let infID: number;

		//Executes the action
		infID = await infractionsManager.warn(
			this.client,
			<string>context.guild?.id,
			target,
			<GuildMember>context.member,
			await this.client.bulbutils.translate("global_mod_action_log", context.guild?.id, {
				action: await this.client.bulbutils.translate("mod_action_types.warn", context.guild?.id, {}),
				moderator: context.author,
				target: target.user,
				reason,
			}),
			reason,
		);

		//Sends the respond context
		await context.channel.send(
			await this.client.bulbutils.translate("action_success", context.guild?.id, {
				action: await this.client.bulbutils.translate("mod_action_types.warn", context.guild?.id, {}),
				target: target.user,
				reason,
				infraction_id: infID,
			}),
		);
	}

	public async validate(context: CommandContext, args: string[], options?: ResolveCommandOptions): Promise<string | undefined> {
		const generalValidate = await super.validate(context, args, options);
		if(generalValidate !== undefined) return generalValidate;

		//Variable declarations
		const targetID: Snowflake = args[0].replace(NonDigits, "");
		const target: GuildMember | null = targetID ? <GuildMember>await context.guild?.members.fetch(targetID).catch(() => null) : null;

		//Checks if target is null and if the target is actionable
		if (!target)
			return await this.client.bulbutils.translate("global_not_found", context.guild?.id, {
				type: await this.client.bulbutils.translate("global_not_found_types.member", context.guild?.id, {}),
				arg_expected: "member:Member",
				arg_provided: args[0],
				usage: this.usage,
			});

		const userHandle = await this.client.bulbutils.resolveUserHandleNew(context, this.client.bulbutils.checkUser(context, target), target.user);
		if (userHandle) return userHandle;

		return;
	}
}
