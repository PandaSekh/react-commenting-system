import { useState, useEffect, createContext } from "react";
import dynamic from "next/dynamic";
import { client } from "../../lib/sanityClient";

const ReactionsContext = createContext(undefined);

export default function AllComments() {
	const [comments, setComments] = useState();
	const [reactions, setReactions] = useState();
	const [isLoading, setIsLoading] = useState(true);

	const Comment = dynamic(() => import("./SingleComment"));
	const LoadingComponent = dynamic(() => import("../LoadingComponent"));

	const query = `*[_type == "comment"]{_id, comment, name, _createdAt, childComments} | order (_createdAt)`;

	useEffect(async () => {
		// Set the already existing comments
		setComments(await client.fetch(query).then(r => r));
		// Subscribe to the query Observable and update the state on each update
		const sub = client.listen(query).subscribe(update => {
			if (update) {
				setComments(comments =>
					[
						...comments.filter(
							comment => comment._id !== update.result._id
						),
						update.result,
					].sort((a, b) => (a._createdAt > b._createdAt ? 1 : -1))
				);
			}
		});

		client
			.fetch(`*[_type == "commentReactions"]`)
			.then(r => setReactions(r));

		// Dynamically import Google ReCaptcha
		(
			await import("../../lib/dynamicScriptLoader")
		).default(
			`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`,
			() => setIsLoading(false)
		);
		// Unsubscribe on Component unmount
		return () => {
			sub.unsubscribe();
		};
	}, []);

	const commentList = comments?.map(comment => {
		return <Comment key={comment._id} comment={comment} />;
	});

	return (
		<ReactionsContext.Provider value={reactions}>
			{isLoading ? <LoadingComponent /> : <ul>{commentList}</ul>}
		</ReactionsContext.Provider>
	);
}

export { ReactionsContext };
