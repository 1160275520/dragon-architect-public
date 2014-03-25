using System;

public struct IntVec2 {
    public int X;
    public int Y;

    public IntVec2(int x, int y) {
        X = x;
        Y = y;
    }
}

public struct IntVec3 {
    public int X;
    public int Y;
    public int Z;

    public IntVec3(int x, int y, int z) {
        X = x;
        Y = y;
        Z = z;
    }

    public static IntVec3 operator+(IntVec3 l, IntVec3 r) {
        return new IntVec3(l.X + r.X, l.Y + r.Y, l.Z + r.Z);
    }

    public override string ToString() {
        return String.Format("<{0},{1},{2}>", X, Y, Z);
    }
}
