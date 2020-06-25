/**
 * External dependencies
 */
import moment from 'moment';
import classnames from 'classnames';
import { isUndefined, pickBy, map, xor } from 'lodash';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

/**
 * Internal dependencies
 */
import fetchPosts from './api';
import createIcebergStore from '../../extensions/settings-store/store';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	withDispatch,
	registerGenericStore,
} from '@wordpress/data';
import { compose } from '@wordpress/compose';
import { withViewportMatch } from '@wordpress/viewport';
import { ESCAPE } from '@wordpress/keycodes';
import { addQueryArgs } from '@wordpress/url';
const {
	Popover,
	Spinner,
	withSpokenMessages,
	Button,
	Dashicon,
	TimePicker,
	CheckboxControl,
} = wp.components;
import {
	Fragment,
	Component,
	RawHTML,
	render,
	createRef,
	useCallback,
} from '@wordpress/element';

registerGenericStore( 'iceberg-settings', createIcebergStore() );

class IcebergEditorialCalendarView extends Component {
	constructor() {
		super( ...arguments );

		this.onSelectionEnd = this.onSelectionEnd.bind( this );
		this.calendar = createRef();

		this.state = {
			isLoading: false,
			anchorRef: null,
			currentEvent: false,
			currentEvents: false,
			isDatePickerOpen: false,
			datePickerData: null,
			isFullscreen: false,
			postStatuses: [ 'publish', 'draft', 'future' ],
		};
	}

	componentDidMount(){
		document.addEventListener( 'mouseup', this.onSelectionEnd );
		document.addEventListener( 'keyup', this.onSelectionEnd );
	}

	onSelectionEnd( event ){
		const { keyCode } = event;
		if ( ESCAPE === keyCode ) {
			this.setState( { anchorRef: null } );
		}
		
		if (
			event.target.classList.contains( 'fc-event-container' ) ||
			event.target.classList.contains( 'fc-widget-content' ) ||
			event.target.classList.contains( 'fc-day-top' )
		) {
			this.setState( { anchorRef: null } );
		}
	}

	render() {
		const {
			reSchedule,
			changeStatus,
			postType,
			restBase,
			isMobile,
		} = this.props;

		const {
			isLoading,
			anchorRef,
			currentEvent,
			isDatePickerOpen,
			postStatuses,
		} = this.state;

		let wrapper = document.getElementById(
			'iceberg-render-editorial-calendar'
		);

		const toggleCheckbox = ( item ) => {
			this.setState( {
				postStatuses: xor( postStatuses, [ item ] ),
			}, () => {
				//refresh calendar
				let calendarApi = this.calendar.current.getApi();
				calendarApi.refetchEvents();
			});
			
		};

		return (
			<Fragment>
				{ isLoading && (
					<div className="iceberg-fc-preloader">
						<Spinner />
					</div>
				) }
				<div className="fc-top-header">
					<Button
						icon={
							this.state.isFullscreen
								? 'editor-contract'
								: 'editor-expand'
						}
						onClick={ () => {
							this.setState(
								{
									isFullscreen: ! this.state.isFullscreen,
								},
								() => {
									if ( this.state.isFullscreen ) {
										document.body.classList.add(
											'is-fullscreen'
										);
									} else {
										document.body.classList.remove(
											'is-fullscreen'
										);
									}
								}
							);
						} }
					>
						{ this.state.isFullscreen
							? __( 'Exit fullscreen mode', 'iceberg' )
							: __( 'Fullscreen mode', 'iceberg' ) }
					</Button>
					<div className="fc-post-statuses">
						<CheckboxControl
							label={ __( 'Drafts', 'iceberg' ) }
							checked={ postStatuses.includes( 'draft' ) }
							onChange={ () => {
								toggleCheckbox( 'draft' );
							} }
						/>
						<CheckboxControl
							label={ __( 'Published', 'iceberg' ) }
							checked={ postStatuses.includes( 'publish' ) }
							onChange={ () => {
								toggleCheckbox( 'publish' );
							} }
						/>
						<CheckboxControl
							label={ __( 'Scheduled', 'iceberg' ) }
							checked={ postStatuses.includes( 'future' ) }
							onChange={ () => {
								toggleCheckbox( 'future' );
							} }
						/>
					</div>
				</div>
				<FullCalendar
					ref={ this.calendar }
					editable={ true }
					dayMaxEventRows={ true }
					initialView={ isMobile ? 'timeGridDay' : 'dayGridMonth' }
					allDaySlot={ false }
					eventDurationEditable={ false }
					height="auto"
					contentHeight="auto"
					nextDayThreshold="24:59:59"
					views={ {
						dayGridMonth: {
							dayMaxEventRows: 5,
						},
					} }
					headerToolbar={ {
						left: 'prev,next today',
						center: 'title',
						right: isMobile
							? null
							: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
					} }
					plugins={ [
						dayGridPlugin,
						timeGridPlugin,
						interactionPlugin,
						listPlugin,
					] }
					initialEvents={ ( atts, callback ) => {
						if ( callback ) {
							fetchPosts(
								postType,
								this.state.postStatuses,
								moment( atts.start ).format( 'YYYY-MM-DD' ),
								moment( atts.end ).format( 'YYYY-MM-DD' ),
								callback
							);
						}
					} }
					eventDrop={ ( info ) => {
						reSchedule(
							info.oldEvent.extendedProps.ID,
							info.event.start,
							restBase
						);
						// this.setState( { anchorRef: null } );
					} }
					eventClick={ ( info ) => {
						const ElementRect = info.el.getBoundingClientRect();
						this.setState( {
							isDatePickerOpen: false,
							currentEvent: info,
							anchorRef: ElementRect,
						} );
					} }
					eventContent={ ( info ) => {
						return (
							<Fragment>
								<div
									className={ classnames(
										'fc-status-' +
											info.event.extendedProps.status,
										'fc-event-button-wrapper'
									) }
								>
									<div className="fc-event-headers">
										<span className="fc-time">
											{ info.timeText }
										</span>
										<span className="fc-status">
											{ info.event.extendedProps.status }
										</span>
									</div>
									<div className="fc-event-title">
										<span className="fc-title">
											{ info.event.title }
										</span>
									</div>
								</div>
								<div className="fc-event-info-placeholder"></div>
							</Fragment>
						);
					} }
					loading={ ( isLoading, view ) => {
						this.setState( { isLoading } );
					} }
				/>
				{ anchorRef && (
					<Popover
						className="component-iceberg-editorial-calendar-info"
						position="bottom left"
						focusOnMount="container"
						anchorRect={ anchorRef }
						animate={ true }
						onFocusOutside={ () => {
							this.setState( { anchorRef: null } );
						} }
					>
						<div className="fc-event-info--close">
							<Button
								icon="no"
								onClick={ () => {
									this.setState( { anchorRef: null } );
								} }
							>
								{ __( 'Close', 'iceberg' ) }
							</Button>
						</div>
						{ ! isDatePickerOpen && (
							<Fragment>
								<h3>{ currentEvent.event.title }</h3>
								<span className="fc-event-info--date">
									{ moment( currentEvent.event.start ).format(
										'MMMM DD, YYYY @ h:mmA'
									) }
								</span>
								<span className="fc-event-info--status">
									<Dashicon icon="welcome-write-blog" />
									{ currentEvent.event.extendedProps.status }
								</span>

								<div className="fc-event-info--actions">
									<Button
										isLink
										onClick={ () => {
											this.setState( {
												isDatePickerOpen: true,
											} );
										} }
									>
										{ __( 'Reschedule', 'iceberg' ) }
									</Button>
									{ 'draft' !==
										currentEvent.event.extendedProps
											.status && (
										<Button
											isLink
											onClick={ () => {
												changeStatus(
													currentEvent.event
														.extendedProps.ID,
													'draft',
													restBase,
													currentEvent
												);

												this.setState( {
													anchorRef: null,
												} );
											} }
										>
											{ __(
												'Switch to draft',
												'iceberg'
											) }
										</Button>
									) }
									<Button
										isLink
										href={ addQueryArgs( 'post.php', {
											post:
												currentEvent.event.extendedProps
													.ID,
											action: 'edit',
										} ) }
									>
										{ __( 'Edit', 'iceberg' ) }
									</Button>
									<Button
										isLink
										href={ addQueryArgs(
											currentEvent.event.extendedProps
												.guid,
											{
												preview: 'true',
											}
										) }
									>
										{ __( 'Preview', 'iceberg' ) }
									</Button>
								</div>
							</Fragment>
						) }

						{ isDatePickerOpen && (
							<Fragment>
								<Button
									isLink
									icon="arrow-left-alt"
									onClick={ () => {
										this.setState( {
											isDatePickerOpen: false,
										} );
									} }
								>
									{ __( 'Back', 'iceberg' ) }
								</Button>
								<TimePicker
									currentTime={ currentEvent.event.start }
									onChange={ ( date ) => {
										this.setState( {
											datePickerData: date,
										} );
									} }
									is12Hour={ true }
								/>
								<Button
									isPrimary
									onClick={ () => {
										reSchedule(
											currentEvent.event.extendedProps.ID,
											this.state.datePickerData,
											restBase,
											currentEvent
										);

										//refresh calendar
										// currentEvent.view.calendar.refetchEvents();
										this.setState( { anchorRef: null } );
									} }
								>
									{ __( 'Reschedule', 'iceberg' ) }
								</Button>
							</Fragment>
						) }
					</Popover>
				) }
			</Fragment>
		);
	}
}

export default compose( [
	withViewportMatch( { isMobile: '< small' } ),
	withDispatch( ( dispatch ) => {
		const { updatePostData } = dispatch( 'iceberg-settings' );
		return {
			reSchedule( postID, newDate, restBase, event ) {
				updatePostData(
					restBase,
					postID,
					{
						date: moment( newDate ).format( 'YYYY-MM-DDTHH:mm:ss' ),
					},
					event
				);
			},
			changeStatus( postID, newStatus, restBase, event ) {
				updatePostData(
					restBase,
					postID,
					{
						status: newStatus,
					},
					event
				);
			},
		};
	} ),
	withSpokenMessages,
] )( IcebergEditorialCalendarView );
