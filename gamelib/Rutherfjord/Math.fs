/// Some basic linear algebra types needed for the block simulation.
namespace Rutherfjord

[<StructuralEquality;NoComparison>]
type IntVec2 = struct
    val X : int
    val Y : int

    new (x, y) = { X=x; Y=y; }

    static member (+) (a:IntVec2, b:IntVec2) = IntVec2(a.X + b.X, a.Y + b.Y)
    static member (-) (a:IntVec2, b:IntVec2) = IntVec2(a.X - b.X, a.Y - b.Y)
    static member (~-) (v:IntVec2) = IntVec2(-v.X, -v.Y)

    static member Zero = IntVec2(0,0)
    static member UnitX = IntVec2(1,0)
    static member UnitY = IntVec2(0,1)

    override v.ToString () = sprintf "<%d,%d>" v.X v.Y
end

[<StructuralEquality;NoComparison>]
type IntVec3 = struct
    val X : int
    val Y : int
    val Z : int

    new (x, y, z) = { X=x; Y=y; Z=z }

    static member (+) (a:IntVec3, b:IntVec3) = IntVec3(a.X + b.X, a.Y + b.Y, a.Z + b.Z)
    static member (-) (a:IntVec3, b:IntVec3) = IntVec3(a.X - b.X, a.Y - b.Y, a.Z - b.Z)
    static member (~-) (v:IntVec3) = IntVec3(-v.X, -v.Y, -v.Z)

    static member Zero = IntVec3(0,0,0)
    static member UnitX = IntVec3(1,0,0)
    static member UnitY = IntVec3(0,1,0)
    static member UnitZ = IntVec3(0,0,1)

    override v.ToString () = sprintf "<%d,%d,%d>" v.X v.Y v.Z
end
