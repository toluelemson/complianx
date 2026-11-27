import { Navigate, useLocation, useParams } from 'react-router-dom';

export function ProjectRouteRedirect({
  destination,
}: {
  destination?: string;
}) {
  const { projectId } = useParams();
  const { search, hash } = useLocation();
  return (
    <Navigate
      replace
      to={{
        pathname: projectId
          ? `/projects/${projectId}${destination ? `/${destination}` : ''}`
          : '/dashboard',
        search,
        hash,
      }}
    />
  );
}
