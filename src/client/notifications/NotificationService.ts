/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { HDateTime, HDict, HList, HRef, HStr } from 'haystack-core'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { fetchVal } from '../fetchVal'
import { NotificationsHandler } from './NotificationsHandler'

/**
 * Notification object that has a Notification backing record.
 */
export interface Notification extends HDict {
	/** The id of the notification record */
	id?: HRef

	/** The target application this notification is intended for  */
	targetApp: HStr

	/** A unique topic the notification addresses  */
	topic: HStr

	/** The kind of notification */
	kind: 'alarm' | 'info' | 'warning' | 'success' | 'error'

	/** The current notification state */
	state: HStr

	/** A message to accompany this notification that is direct to the end user */
	message?: HStr

	lastUpdateTime?: HDateTime

	creation?: HDateTime
}

/**
 * The subject changed event callback handler.
 */
export interface NotificationEventHandler {
	(notification: Notification[]): void
}

/**
 * An implementation of the FIN Notification service.
 */
export class NotificationService<
	NotificationType extends Notification = Notification
> {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the service.
	 */
	readonly #url: string

	/**
	 * Constructs a new notifications service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#url = serviceConfig.getServiceUrl('notifications')
	}

	async make(
		callbacks: NotificationEventHandler[]
	): Promise<NotificationsHandler> {
		const notificationHandler = new NotificationsHandler({
			notificationService: this,
			callbacks,
		})

		await notificationHandler.open()
		return notificationHandler
	}

	/**
	 * Get all the notifications in the system for the current user
	 *
	 * @returns The result of the read operation.
	 */
	async readAll(): Promise<NotificationType[]> {
		const notifications = await fetchVal<HList<NotificationType>>(
			`${this.#url}`,
			{
				method: 'GET',
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return notifications.toArray()
	}

	/**
	 * Get notification topics that are visible to the current user
	 *
	 * @returns The result of the read operation.
	 */
	async readAllTopics(): Promise<HStr[]> {
		const topics = await fetchVal<HList<HStr>>(
			`${this.#url}/topics`,
			{
				method: 'GET',
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return topics.toArray()
	}

	/**
	 * Get all notifications in the system for the current user filtered
	 * according to the user notification settings.
	 *
	 * @param filter A haystack filter
	 * @returns The result of the read operation.
	 */
	async readAllCurrentFiltered(filter?: string): Promise<NotificationType[]> {
		const currentFilter = filter ?? ''

		const notifications = await fetchVal<HList<NotificationType>>(
			`${this.#url}/current?filter=${currentFilter}`,
			{
				method: 'GET',
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return notifications.toArray()
	}

	/**
	 * Get notifications for a topic that are visible to the
	 * current user
	 *
	 * @param filter A haystack filter
	 * @returns The filtered notifications.
	 */
	async readByTopicFilter(filter?: string): Promise<NotificationType> {
		const topicFilter = filter ?? ''

		const topicFilteredNotifications = await fetchVal<NotificationType>(
			`${this.#url}/topics?filter=${topicFilter}`,
			{
				method: 'GET',
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return topicFilteredNotifications
	}

	/**
	 * This operations will only be valid if the current user has write access to the
	 * notification `targetApp` and to the project the notification is stored in.
	 * Super users are allowed to post any notification, including system ones.
	 *
	 * @param notification The notification object
	 * @returns The filtered notifications.
	 */
	async create(notification: NotificationType): Promise<HRef> {
		const createdNotificationId = await fetchVal<HRef>(
			`${this.#url}`,
			{
				method: 'POST',
				body: JSON.stringify(notification),
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return createdNotificationId
	}

	/**
	 * Get all the new notifications in the system for the current user.
	 *
	 * @param timeOfLastMod Time of the last modification.
	 * @returns New notifications since timeOfLastMod
	 */
	async poll(timeOfLastMod: HDateTime): Promise<NotificationType[]> {
		const notifications = await fetchVal<HList<NotificationType>>(
			`${this.#url}/poll`,
			{
				method: 'POST',
				body: JSON.stringify(timeOfLastMod),
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return notifications.toArray()
	}

	/**
	 * Marks the state of notification with the specified id as resolved.
	 *
	 * @param id The notification ID to resolve
	 * @returns The notification object
	 */
	async resolve(id: string | HRef): Promise<NotificationType> {
		const resolvedNotification = await fetchVal<NotificationType>(
			`${this.#url}/resolve/${HRef.make(id).value}`,
			{
				method: 'PATCH',
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(id),
			},
			this.#serviceConfig.fetch
		)

		return resolvedNotification
	}

	/**
	 * Marks the state of notification state as dismissed.
	 *
	 * @param id The notification ID to dismiss
	 * @returns The notification object
	 */
	async dismiss(id: string | HRef): Promise<NotificationType> {
		const dismissedNotification = await fetchVal<NotificationType>(
			`${this.#url}/dismiss/${HRef.make(id).value}`,
			{
				method: 'PATCH',
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(id),
			},
			this.#serviceConfig.fetch
		)

		return dismissedNotification
	}
}
