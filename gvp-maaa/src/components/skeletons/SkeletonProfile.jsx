import SkeletonBox from "./SkeletonBox";

const SkeletonProfile = () => {
  return (
    <div className="space-y-4">
      <SkeletonBox className="h-6 w-1/3" />
      <SkeletonBox className="h-4 w-1/2" />
      <SkeletonBox className="h-4 w-2/3" />
      <SkeletonBox className="h-4 w-1/4" />
    </div>
  );
};

export default SkeletonProfile;
