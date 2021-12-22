import { Message } from "discord.js";
import Command from "../../../../structures/Command";
import SubCommand from "../../../../structures/SubCommand";
import CommandContext from "../../../../structures/CommandContext";
import BulbBotClient from "../../../../structures/BulbBotClient";
import { cd, exec, ShellString } from "shelljs";
import { join } from "path";

export default class extends SubCommand {
	constructor(client: BulbBotClient, parent: Command) {
		super(client, parent, {
			name: "code",
			usage: "code",
			aliases: ["pull"],
			description: "Pulls the latest code from the repository",
		});
	}

	public async run(context: CommandContext): Promise<void | Message> {
		const path: string = join(__dirname, "/../../../../../");
		cd(path);

		const resp: ShellString = exec(`git pull`);
		context.channel.send(`Successfully pulled the latest code\nCode: **${resp.code.toString()}**\n**Message:**\n\`\`\`${resp.stdout}\`\`\``);
	}
}
