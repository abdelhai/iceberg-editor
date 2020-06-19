/**
 * External dependencies
 */
import moment from 'moment';
import { isUndefined, pickBy, map } from 'lodash';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
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
const {
	Popover,
	Spinner,
	withSpokenMessages,
	Button,
	Dashicon,
} = wp.components;
import { Fragment, Component, RawHTML, render } from '@wordpress/element';

registerGenericStore( 'iceberg-settings', createIcebergStore() );

class IcebergEditorialCalendarView extends Component {
	constructor() {
		super( ...arguments );

		this.onSelectionEnd = this.onSelectionEnd.bind( this );

		this.state = {
			anchorRef: null,
			currentEvent: false,
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
			( document.querySelector( '.component-iceberg-editorial-calendar-info' ) && ! document.querySelector( '.component-iceberg-editorial-calendar-info' ).contains( event.target ) && ! document.querySelector( '.component-iceberg-editorial-calendar-info' ).contains( event.target ) ) &&
			! event.target.classList.contains( 'fc-event' ) &&
			! event.target.classList.contains( 'fc-title' ) &&
			! event.target.classList.contains( 'fc-title-inner' ) &&
			! event.target.classList.contains( 'fc-status' ) &&
			! event.target.classList.contains( 'fc-time' )
		) {
			this.setState( { anchorRef: null } );
		}
	}

	render() {
		const { reSchedule, postType, isMobile } = this.props;
		const { anchorRef, currentEvent } = this.state;
		return (
			<Fragment>
				<FullCalendar
					editable={ true }
					defaultView={ isMobile ? 'timeGridDay' : 'dayGridMonth' }
					allDaySlot={ false }
					eventDurationEditable={ false }
					height="auto"
					contentHeight="auto"
					nextDayThreshold="24:59:59"
					header={ {
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
					] }
					events={ ( { start, end }, callback ) => {
						if ( callback ) {
							fetchPosts(
								postType,
								moment( start ).format( 'YYYY-MM-DD' ),
								moment( end ).format( 'YYYY-MM-DD' ),
								callback
							);
						}
					} }
					eventDrop={ ( info ) => {
						reSchedule(
							info.oldEvent.extendedProps.ID,
							info.event.start,
							postType
						);
						// this.setState( { anchorRef: null } );
					} }
					eventClick={ ( info ) => {
						const ElementRect = info.el.getBoundingClientRect();
						this.setState( {
							currentEvent: info,
							anchorRef: ElementRect,
						} );
					} }
					eventRender={ ( info ) => {
						const title = info.el.querySelector( '.fc-title' );
						title.innerHTML =
							'<span class="fc-title-inner">' +
							title.innerHTML +
							'</span>';
						info.el
							.querySelector( '.fc-time' )
							.insertAdjacentHTML(
								'afterend',
								'<span class="fc-status">' +
									info.event.extendedProps.status +
									'</span>'
							);

						info.el.classList.add(
							'fc-status-' + info.event.extendedProps.status
						);

						return info.el;
					} }
					loading={ ( isLoading, view ) => {
						// console.log( isLoading );
					} }
				/>
				{ anchorRef && (
					<Popover
						className="component-iceberg-editorial-calendar-info"
						position="bottom left"
						focusOnMount="container"
						anchorRect={ anchorRef }
						onFocusOutside={ () => {
							this.setState( { anchorRef: null } );
						} }
					>
						{ /* { console.log( currentEvent.event.start ) } */ }
						<h3>{ currentEvent.event.title }</h3>
						<span className="fc-event-info--date">
							{ moment( currentEvent.event.start ).format(
								'MMMM DD, YYYY @ H:mmA'
							) }
						</span>
						<span className="fc-event-info--status">
							<Dashicon icon="welcome-write-blog" />
							{ currentEvent.event.extendedProps.status }
						</span>
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
			reSchedule( postID, newDate, postType ) {
				updatePostData( postID, {
					date: moment( newDate ).format( 'YYYY-MM-DDTHH:mm:ss' ),
				} );
			},
		};
	} ),
	withSpokenMessages,
] )( IcebergEditorialCalendarView );
