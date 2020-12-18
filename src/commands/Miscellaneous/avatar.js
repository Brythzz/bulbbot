const Command = require("../../structures/Command");
const Discord = require("discord.js");

module.exports = class extends (
	Command
) {
	constructor(...args) {
		super(...args, {
			description: "Gets a users avatar picture",
			category: "Miscellaneous",
			usage: "!avatar [user]",
			argList: ["user:User"],
			maxArgs: 1,
		});
	}

	async run(message, args) {
		let id;
		if (args[0] === undefined) id = message.author.id;
		else id = args[0].replace(/\D/g, "");
		let user;
		try {
			user = await this.client.users.fetch(id);
		} catch (error) {
			return message.channel.send(this.client.bulbutils.translate("global_user_not_found"));
		}

		let desc = "";
		const formats = ["png", "jpg", "webp"];
		const sizes = [64, 128, 512, 4096];
		if (user.avatarURL({ dynamic: true }).endsWith(".gif")) {
			desc += "**gif: **";
			sizes.forEach(size => {
				desc += `[[${size}]](${user.avatarURL({ format: "gif", size })}) `;
			});
		}
		formats.forEach(format => {
			desc += `\n**${format}: **`;
			sizes.forEach(size => {
				desc += `[[${size}]](${user.avatarURL({ format, size })}) `;
			});
		});

		const embed = new Discord.MessageEmbed()
			.setColor(process.env.EMBED_COLOR)
			.setAuthor(`${user.tag} (${user.id})`, user.avatarURL({ dynamic: true }))
			.setDescription(desc)
			.setImage(user.avatarURL({ dynamic: true, size: 4096 }))
			.setFooter(
				this.client.bulbutils.translate("global_executed_by", {
					user_name: await this.client.bulbutils.userObject(true, message.member).username,
					user_discriminator: await this.client.bulbutils.userObject(true, message.member).discriminator,
				}),
				message.author.avatarURL({ dynamic: true }),
			)
			.setTimestamp();

		return message.channel.send(embed);
	}
};