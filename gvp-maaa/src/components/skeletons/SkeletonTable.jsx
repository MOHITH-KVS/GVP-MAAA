import SkeletonBox from "./SkeletonBox";

const SkeletonTable = ({ rows = 6 }) => {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid grid-cols-5 gap-4">
          <SkeletonBox className="h-4" />
          <SkeletonBox className="h-4" />
          <SkeletonBox className="h-4" />
          <SkeletonBox className="h-4" />
          <SkeletonBox className="h-4" />
        </div>
      ))}
    </div>
  );
};

export default SkeletonTable;
