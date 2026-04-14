import SkeletonBox from "./SkeletonBox";

const SkeletonCard = () => {
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border space-y-3">
      <SkeletonBox className="h-4 w-1/3" />
      <SkeletonBox className="h-6 w-full" />
      <SkeletonBox className="h-6 w-2/3" />
    </div>
  );
};

export default SkeletonCard;
