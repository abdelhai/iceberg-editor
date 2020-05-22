/**
 * External dependencies
 */
import showdown from 'showdown';

/**
 * Internal dependencies
 */
import stripHTMLComments from '../utils/stripHTMLComments';
/**
 * WordPress dependencies
 */
import { ClipboardButton } from '@wordpress/components';
import { withDispatch, withSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { withState, compose } from '@wordpress/compose';

function CopyContentMarkdownMenuItem( {
	createNotice,
	editedPostContent,
	hasCopied,
	setState,
} ) {
	const parseContent = () => {
		const converter = new showdown.Converter();
		let text = stripHTMLComments( editedPostContent );

		// Strip selected html tags
		text = text.replace( /<div[^>]*>|<\/div>$/g, '' );
		text = text.replace( /<figcaption[^>]*>.*?<\/figcaption>/gi, '' );
		text = text.replace(
			/<figure[^>]*>([\w\W]*?)<\/figure>/g,
			'<p>$1</p>'
		);

		const md = converter.makeMarkdown( text );
		return md;
	};
	return (
		editedPostContent.length > 0 && (
			<ClipboardButton
				text={ parseContent }
				role="menuitem"
				className="components-menu-item__button"
				onCopy={ () => {
					setState( { hasCopied: true } );
					createNotice(
						'info',
						__( 'All content copied.', 'iceberg' ),
						{
							isDismissible: true,
							type: 'snackbar',
						}
					);
				} }
				onFinishCopy={ () => setState( { hasCopied: false } ) }
			>
				{ hasCopied
					? __( 'Copied' )
					: __( 'Copy content as markdown', 'iceberg' ) }
			</ClipboardButton>
		)
	);
}

export default compose(
	withSelect( ( select ) => ( {
		editedPostContent: select( 'core/editor' ).getEditedPostAttribute(
			'content'
		),
	} ) ),
	withDispatch( ( dispatch ) => {
		const { createNotice } = dispatch( 'core/notices' );

		return {
			createNotice,
		};
	} ),
	withState( { hasCopied: false } )
)( CopyContentMarkdownMenuItem );
